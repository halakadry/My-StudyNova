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

// Local YYYY-MM-DD
function todayString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function buildAndSaveSchedule(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const tasks = await Task.find({ userId, status: 'pending' }).sort({ priorityScore: -1 });
  const exams = await Exam.find({ userId, date: { $gte: new Date() } }).sort({ date: 1 });

  if (tasks.length === 0 && exams.length === 0) {
    throw new Error('No pending tasks or upcoming exams to schedule');
  }

  const weeklyAvailability = calculateWeeklyAvailability(user);
  const constraints = user.constraints || {};

  // For overload check, use the lowest single-day availability as a conservative baseline
  const minDailyHours = Math.min(...Object.values(weeklyAvailability));

  let result = await generateSchedule(tasks, exams, weeklyAvailability, constraints);
  let overloadCheck = detectOverload(result.schedule, minDailyHours);

  let retryCount = 0;
  while (overloadCheck.needsRegeneration && retryCount < 3) {
    retryCount++;
    result = await generateSchedule(tasks, exams, weeklyAvailability, constraints);
    overloadCheck = detectOverload(result.schedule, minDailyHours);
  }

  // Add recurring commitments (gym, classes...) as fixed entries AFTER the overload check,
  // so they are shown in the schedule but not counted as study hours
  const studyEntries = result.schedule.map((e) => ({ ...e, type: 'study', completed: false }));
  const commitmentEntries = buildCommitmentEntries(user.recurringCommitments, studyEntries);
  const newEntries = [...studyEntries, ...commitmentEntries].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return (a.type === 'commitment' ? 0 : 1) - (b.type === 'commitment' ? 0 : 1);
  });

  // Keep past study sessions (done or not) as history for the analytics dashboard
  const today = todayString();
  const oldSchedule = await Schedule.findOne({ userId });
  const history = oldSchedule
    ? oldSchedule.entries
        .filter((e) => e.date < today && e.type !== 'commitment')
        .map((e) => e.toObject())
    : [];

  await Schedule.findOneAndDelete({ userId });
  const savedSchedule = await Schedule.create({
    userId,
    entries: [...history, ...newEntries],
    overloadedDays: overloadCheck.overloadedDays,
    isOverloaded: overloadCheck.isOverloaded,
    reliableSchedule: !overloadCheck.needsRegeneration
  });

  return { savedSchedule, regenerationAttempts: retryCount };
}

router.post('/generate', async (req, res) => {
  try {
    const { savedSchedule, regenerationAttempts } = await buildAndSaveSchedule(req.body.userId);
    res.status(200).json({ ...savedSchedule.toObject(), regenerationAttempts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/reschedule', async (req, res) => {
  try {
    const { savedSchedule, regenerationAttempts } = await buildAndSaveSchedule(req.body.userId);
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
    const schedule = await Schedule.findOne({ userId: req.params.userId });
    if (!schedule) return res.status(404).json({ error: 'No schedule found' });
    res.json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;