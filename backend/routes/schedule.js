const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Schedule = require('../models/Schedule');
const { generateSchedule } = require('../services/geminiService');
const detectOverload = require('../utils/overloadDetection');
const calculateWeeklyAvailability = require('../utils/weeklyAvailability');
const buildCommitmentEntries = require('../utils/commitmentEntries');

const MIN_SESSION_HOURS = 2;
const MAX_SESSION_HOURS = 4;
const MAX_ATTEMPTS = 2;
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Local YYYY-MM-DD
function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayString() {
  return toDateString(new Date());
}

function parseDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDaysStr(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

// All dates from start to end, inclusive
function dateRange(startStr, endStr) {
  const out = [];
  let cur = startStr;
  while (cur <= endStr) {
    out.push(cur);
    cur = addDaysStr(cur, 1);
  }
  return out;
}

// Session names are matched case-insensitively ("Math exam prep" = "math exam prep")
function nameKey(s) {
  return String(s || '').trim().toLowerCase();
}

// Hours still to do. 0 = finished. Never less than one minimum session.
function remainingHours(total, done) {
  const left = total - done;
  if (left <= 0) return 0;
  return Math.max(MIN_SESSION_HOURS, Math.round(left));
}

// Realistic study hours still possible today (the day is partly over)
function hoursLeftToday(user, weeklyAvailability, doneTodayHours) {
  const now = new Date();
  const nowH = now.getHours() + now.getMinutes() / 60;
  const sleep = user.sleepTime ?? 23;
  const wake = user.wakeTime ?? 8;

  let untilSleep;
  if (sleep > wake) {
    untilSleep = Math.max(0, sleep - nowH);
  } else {
    untilSleep = nowH >= wake ? 24 - nowH + sleep : Math.max(0, sleep - nowH);
  }

  const dayName = DAYS[now.getDay()];
  const commitmentsLeft = (user.recurringCommitments || [])
    .filter((c) => c.day === dayName)
    .reduce((sum, c) => sum + Math.max(0, c.endHour - Math.max(c.startHour, nowH)), 0);

  const realisticLeft = untilSleep - commitmentsLeft - 1; // 1h buffer for dinner / breaks
  const freeToday = (weeklyAvailability[dayName] ?? 0) - doneTodayHours;

  return Math.max(0, Math.floor(Math.min(realisticLeft, freeToday)));
}

// Everything that must be scheduled, with the days it is allowed on
function buildItems(tasksForAI, examsForAI, today) {
  const taskItems = tasksForAI.map((t) => ({
    name: t.title,
    needed: t.durationHours,
    days: dateRange(today, toDateString(t.deadline)), // today → deadline
    fillFromEnd: false, // tasks: as early as possible
  }));

  const examItems = examsForAI.map((e) => {
    const examDay = toDateString(e.date);
    const windowDays = e.prepHoursNeeded > 10 ? 14 : 7;
    let end = addDaysStr(examDay, -1);
    let start = addDaysStr(examDay, -windowDays);
    if (start < today) start = today;
    if (end < start) end = start;
    return {
      name: `${e.subject} exam prep`,
      needed: e.prepHoursNeeded,
      days: dateRange(start, end), // prep window only
      fillFromEnd: true, // exam prep: close to the exam
    };
  });

  return [...taskItems, ...examItems];
}

// Study capacity of a given date (today = hours left today)
function makeCapacity(weeklyAvailability, todayLimit, today) {
  return (dateStr) => {
    if (dateStr === today) return todayLimit;
    const dayName = DAYS[parseDate(dateStr).getDay()];
    return weeklyAvailability[dayName] ?? 0;
  };
}

// Keeps only AI sessions that follow every rule. Returns the valid ones.
function validateEntries(rawEntries, items, capacityOf, today) {
  const byKey = {};
  items.forEach((it) => {
    byKey[nameKey(it.name)] = { allowed: new Set(it.days), needed: it.needed, planned: 0 };
  });

  const usedPerDay = {};
  const dropped = [];

  const valid = [...(rawEntries || [])]
    .filter((e) => e && e.date && Number(e.hours) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((e) => {
      const hours = Number(e.hours);
      const item = byKey[nameKey(e.task)];
      let reason = null;

      if (e.date < today) reason = 'in the past';
      else if (!item) reason = 'unknown task name';
      else if (!item.allowed.has(e.date)) reason = 'after deadline / outside prep window';
      else if (item.planned + hours > item.needed) reason = 'more hours than needed';
      else if ((usedPerDay[e.date] || 0) + hours > capacityOf(e.date)) reason = 'day is full';

      if (reason) {
        dropped.push(`${e.date} ${e.task} ${hours}h (${reason})`);
        return false;
      }
      item.planned += hours;
      usedPerDay[e.date] = (usedPerDay[e.date] || 0) + hours;
      return true;
    })
    .map((e) => ({ date: e.date, task: e.task, hours: Number(e.hours) }));

  if (dropped.length) console.log('Removed invalid AI sessions ->', dropped.join(' | '));
  return valid;
}

// How many hours each item is still missing in a given list of entries
function findShortfalls(entries, items) {
  const planned = {};
  (entries || []).forEach((e) => {
    const key = nameKey(e.task);
    planned[key] = (planned[key] || 0) + Number(e.hours || 0);
  });
  return items
    .map((it) => ({ ...it, missing: it.needed - (planned[nameKey(it.name)] || 0) }))
    .filter((it) => it.missing >= MIN_SESSION_HOURS);
}

// Adds the missing sessions in code, only on allowed days with free time
function topUpShortfalls(entries, shortfalls, capacityOf) {
  const used = {};
  entries.forEach((e) => {
    used[e.date] = (used[e.date] || 0) + Number(e.hours || 0);
  });
  const roomOn = (dateStr) => Math.floor(capacityOf(dateStr) - (used[dateStr] || 0));

  const added = [];
  shortfalls.forEach((item) => {
    let missing = item.missing;
    const days = item.fillFromEnd ? [...item.days].reverse() : item.days;

    // One session per day per pass, so the work is spread out
    let progress = true;
    while (missing >= MIN_SESSION_HOURS && progress) {
      progress = false;
      for (const date of days) {
        if (missing < MIN_SESSION_HOURS) break;
        const hours = Math.min(MAX_SESSION_HOURS, missing, roomOn(date));
        if (hours < MIN_SESSION_HOURS) continue;
        added.push({ date, task: item.name, hours });
        used[date] = (used[date] || 0) + hours;
        missing -= hours;
        progress = true;
      }
    }

    if (missing >= MIN_SESSION_HOURS) {
      console.log(`Could not fit ${missing}h of "${item.name}" before its deadline (not enough free time)`);
    }
  });

  return added;
}

async function buildAndSaveSchedule(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const today = todayString();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const tasks = await Task.find({ userId, status: 'pending' }).sort({ priorityScore: -1 });
  const exams = await Exam.find({ userId, date: { $gte: new Date() } }).sort({ date: 1 });
  const oldSchedule = await Schedule.findOne({ userId }).sort({ updatedAt: -1 });

  // Hours already marked done: per task/exam name, and in total for today
  const doneHours = {};
  let doneTodayHours = 0;
  (oldSchedule?.entries || []).forEach((e) => {
    if (e.type !== 'commitment' && e.completed) {
      const key = nameKey(e.task);
      doneHours[key] = (doneHours[key] || 0) + e.hours;
      if (e.date === today) doneTodayHours += e.hours;
    }
  });

  // Only what is still left to do (and skip overdue tasks)
  const tasksForAI = tasks
    .filter((t) => t.deadline >= startOfToday)
    .map((t) => ({
      ...t.toObject(),
      durationHours: remainingHours(t.durationHours, doneHours[nameKey(t.title)] || 0),
    }))
    .filter((t) => t.durationHours > 0);

  const examsForAI = exams
    .map((e) => ({
      ...e.toObject(),
      prepHoursNeeded: remainingHours(e.prepHoursNeeded, doneHours[nameKey(`${e.subject} exam prep`)] || 0),
    }))
    .filter((e) => e.prepHoursNeeded > 0);

  if (tasksForAI.length === 0 && examsForAI.length === 0) {
    throw new Error('Nothing left to schedule');
  }

  const weeklyAvailability = calculateWeeklyAvailability(user);
  const constraints = user.constraints || {};
  const todayLimit = hoursLeftToday(user, weeklyAvailability, doneTodayHours);
  const capacityOf = makeCapacity(weeklyAvailability, todayLimit, today);
  const items = buildItems(tasksForAI, examsForAI, today);
  console.log('Today limit:', todayLimit, '| done today:', doneTodayHours, '| today:', today);

  const minDailyHours = Math.min(...Object.values(weeklyAvailability));

  // Ask the AI (up to 2 times) and keep the answer with the most valid hours
  let best = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await generateSchedule(tasksForAI, examsForAI, weeklyAvailability, constraints, todayLimit);
    const valid = validateEntries(result.schedule, items, capacityOf, today);
    const missingTotal = findShortfalls(valid, items).reduce((sum, s) => sum + s.missing, 0);
    if (!best || missingTotal < best.missingTotal) best = { valid, missingTotal, attempts: attempt };
    if (missingTotal === 0) break;
  }

  // Fill in whatever is still missing, only on allowed days with free time
  const shortfalls = findShortfalls(best.valid, items);
  if (shortfalls.length) {
    console.log('Missing after AI ->', shortfalls.map((s) => `${s.name}: ${s.missing}h`).join(', '), '| adding in code');
  }
  const addedEntries = topUpShortfalls(best.valid, shortfalls, capacityOf);
  const finalStudy = [...best.valid, ...addedEntries];

  const overloadCheck = detectOverload(finalStudy, minDailyHours);

  // Add recurring commitments (gym, classes...) as fixed entries, not counted as study hours
  const studyEntries = finalStudy.map((e) => ({ ...e, type: 'study', completed: false }));
  const commitmentEntries = buildCommitmentEntries(user.recurringCommitments, studyEntries);
  const newEntries = [...studyEntries, ...commitmentEntries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.type === 'commitment' ? 0 : 1) - (b.type === 'commitment' ? 0 : 1);
  });

  // Keep history: all past study sessions + every session marked done
  const history = oldSchedule
    ? oldSchedule.entries
        .filter((e) => e.type !== 'commitment' && (e.date < today || e.completed))
        .map((e) => e.toObject())
    : [];

  // Update in place (never delete + create), then remove any duplicate copies
  const savedSchedule = await Schedule.findOneAndUpdate(
    oldSchedule ? { _id: oldSchedule._id } : { userId },
    {
      userId,
      entries: [...history, ...newEntries],
      overloadedDays: overloadCheck.overloadedDays,
      isOverloaded: overloadCheck.isOverloaded,
      reliableSchedule: !overloadCheck.needsRegeneration,
    },
    { upsert: true, returnDocument: 'after' }
  );
  await Schedule.deleteMany({ userId, _id: { $ne: savedSchedule._id } });

  return { savedSchedule, regenerationAttempts: best.attempts };
}

// Only one rebuild per user at a time: a second request waits for the running one
const runningBuilds = new Map();
function buildOnce(userId) {
  const key = String(userId);
  if (runningBuilds.has(key)) return runningBuilds.get(key);
  const promise = buildAndSaveSchedule(userId).finally(() => runningBuilds.delete(key));
  runningBuilds.set(key, promise);
  return promise;
}

router.post('/generate', async (req, res) => {
  try {
    const { savedSchedule, regenerationAttempts } = await buildOnce(req.body.userId);
    res.status(200).json({ ...savedSchedule.toObject(), regenerationAttempts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reschedule', async (req, res) => {
  try {
    const { savedSchedule, regenerationAttempts } = await buildOnce(req.body.userId);
    res.status(200).json({ ...savedSchedule.toObject(), regenerationAttempts, rescheduled: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a single study session as done / not done
router.patch('/entry/:entryId/toggle', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ 'entries._id': req.params.entryId });
    if (!schedule) return res.status(404).json({ error: 'Session not found' });

    const entry = schedule.entries.id(req.params.entryId);
    if (entry.type === 'commitment') {
      return res.status(400).json({ error: 'Commitments cannot be marked as done' });
    }

    entry.completed = !entry.completed;
    await schedule.save();
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const schedule = await Schedule.findOne({ userId: req.params.userId }).sort({ updatedAt: -1 });
    if (!schedule) return res.status(404).json({ error: 'No schedule found' });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;