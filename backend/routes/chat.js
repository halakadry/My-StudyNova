const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Task = require('../models/Task');
const Exam = require('../models/Exam');
const Schedule = require('../models/Schedule');
const calculateWeeklyAvailability = require('../utils/weeklyAvailability');
const { askAssistant } = require('../services/assistantService');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// How to use the website — so the assistant can guide users step by step
const APP_GUIDE = `
HOW STUDYNOVA WORKS (use this to guide the student step by step):

Overview tab:
- Shows today's plan, study hours today, pending tasks, and a countdown to the next exam.
- Today's study sessions can be marked with "✓ Done".

Tasks & Exams tab:
- Add a task: type the title, pick the deadline date and difficulty (Easy / Medium / Hard), optionally type the hours, then click "Add task".
- If the hours field is left empty, the AI estimates the hours automatically and the task shows "AI est.".
- Each task has "✓ Done" (task finished), "Edit" (change title, date, difficulty or hours) and "Delete".
- Add an exam: type the subject, pick the exam date and difficulty, then click "Add exam". Prep hours are estimated automatically (about 5h Easy, 10h Medium, 18h Hard, less if the exam is very soon). They can be changed with "Edit".
- Exam prep starts 1 week before the exam (10 prep hours or less) or 2 weeks before (more than 10 hours), with the heaviest sessions near the exam.
- The schedule updates automatically after adding, editing, deleting or completing a task or exam.

Schedule tab:
- "Week" view shows a Sunday–Saturday calendar; "← Prev" / "Next →" move between weeks. "List" view shows day by day.
- Study sessions are green; fixed commitments like the gym are gold.
- Click ✓ on a session to mark it done (↺ to undo). This counts toward Analytics.
- "Regenerate with AI" builds a fresh plan from all pending tasks and exams, starting from today.
- Sessions cannot be dragged to another day. To shift work, the student can simply study on another day if the deadline allows, then click "Regenerate with AI" so the remaining work is spread over the days left.

Analytics tab:
- Task completion %, schedule adherence % (planned sessions marked done), and study hours planned vs done per week.

Settings tab:
- Sleep time and wake time (24h numbers, e.g. 23 and 8).
- Recurring commitments: pick the day, type a label (e.g. Gym), start hour and end hour, click "Add", then "Save settings".
- These reduce the free study hours per day, so the AI never schedules study on top of them.

Assistant tab:
- This chat.

TYPICAL HOURS (to help the student decide what to type):
- Short homework / exercise sheet: 2–4h
- Lab report or short essay: 4–8h
- Programming assignment: 8–20h
- Big project: 20–40h
Harder difficulty means toward the top of the range. If unsure, leave the hours empty and the AI will estimate.
Every study session is 2–4 hours, so tasks under 2 hours are not useful to add.`;

// Builds the assistant's instructions + a snapshot of the student's real data
function buildContext(user, tasks, exams, schedule) {
  const now = new Date();
  const today = toDateString(now);
  const in14 = new Date(now);
  in14.setDate(in14.getDate() + 14);
  const until = toDateString(in14);
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });

  const tasksText = tasks.length
    ? tasks
        .map(
          (t) =>
            `- ${t.title} | due ${toDateString(t.deadline)} | ${t.difficulty} | ${t.durationHours}h | ${t.status}`
        )
        .join('\n')
    : 'None';

  const examsText = exams.length
    ? exams
        .map(
          (e) => `- ${e.subject} exam | ${toDateString(e.date)} | ${e.difficulty} | ~${e.prepHoursNeeded}h prep`
        )
        .join('\n')
    : 'None';

  const entries = schedule?.entries || [];
  const upcomingText =
    entries
      .filter((e) => e.date >= today && e.date <= until)
      .map((e) =>
        e.type === 'commitment'
          ? `- ${e.date}: ${e.task} ${e.startHour}:00-${e.endHour}:00 (fixed commitment)`
          : `- ${e.date}: ${e.task} ${e.hours}h${e.completed ? ' (done)' : ''}`
      )
      .join('\n') || 'No schedule yet';

  // Free vs scheduled hours for the next 7 days — lets the assistant answer "can I move this to tomorrow?"
  const availability = calculateWeeklyAvailability(user);
  const capacityLines = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateStr = toDateString(d);
    const dayName = DAYS[d.getDay()];
    const free = availability[dayName] ?? 0;
    const scheduled = entries
      .filter((e) => e.date === dateStr && e.type !== 'commitment')
      .reduce((sum, e) => sum + e.hours, 0);
    const label = i === 0 ? ' (today)' : i === 1 ? ' (tomorrow)' : '';
    capacityLines.push(
      `- ${dateStr} ${dayName}${label}: ${free}h free for study, ${scheduled}h already scheduled, ${Math.max(
        0,
        Math.round((free - scheduled) * 10) / 10
      )}h left`
    );
  }

  const due = entries.filter((e) => e.type !== 'commitment' && e.date <= today);
  const done = due.filter((e) => e.completed).length;
  const adherenceText = due.length
    ? `${done} of ${due.length} planned sessions done so far (${Math.round((done / due.length) * 100)}%)`
    : 'No sessions due yet';

  return `You are the StudyNova Assistant, a friendly helper inside the StudyNova academic planner website.
Today is ${weekday}, ${today}.

You help the student with three kinds of questions:
1. How to use the website (how to add a task, how many hours to enter, how to add the gym, etc.). Give clear numbered steps using the exact button and tab names from the guide below.
2. Questions about their own plan ("what should I study today?", "can I study today's work tomorrow?", "am I on track?"). Use their real data below. For moving work to another day, check that day's hours left and the related deadline, then say clearly whether it fits and what to do.
3. Any other question (explaining a study topic, study tips, general questions). Answer helpfully and briefly.

RULES:
- Reply in the same language the student writes in (Arabic, Hebrew or English).
- Keep answers short and clear: a few sentences, a short list, or numbered steps.
- Use plain text only. For lists use "- " or "1. " at the start of the line. Do NOT use markdown symbols like ** or #.
- You cannot click buttons or change their data yourself. Tell them exactly what to click.
- Never invent tasks, exams or dates that are not in the data.
${APP_GUIDE}

STUDENT DATA
Tasks:
${tasksText}

Upcoming exams:
${examsText}

Schedule for the next 14 days:
${upcomingText}

Study capacity for the next 7 days:
${capacityLines.join('\n')}

Progress: ${adherenceText}`;
}

router.post('/', async (req, res) => {
  try {
    const { userId, messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'No messages sent' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [tasks, exams, schedule] = await Promise.all([
      Task.find({ userId }),
      Exam.find({ userId, date: { $gte: startOfToday } }).sort({ date: 1 }),
      Schedule.findOne({ userId }),
    ]);

    const systemInstruction = buildContext(user, tasks, exams, schedule);

    // Only the last 10 messages, each capped in length, to keep requests small
    const history = messages
      .slice(-10)
      .filter((m) => m.text && String(m.text).trim())
      .map((m) => ({ role: m.role, text: String(m.text).slice(0, 2000) }));

    const reply = await askAssistant(systemInstruction, history);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;