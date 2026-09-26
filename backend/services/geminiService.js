const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MIN_SESSION_HOURS = 2; // no tiny sessions
const MAX_SESSION_HOURS = 4;

// Used when the AI can't estimate task hours
const DEFAULT_TASK_HOURS = { Easy: 3, Medium: 6, Hard: 10 };

// Local YYYY-MM-DD (avoids UTC shifting the date after midnight in Israel)
function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

// 1 week of prep for lighter exams, 2 weeks for heavier ones
function getWindowDays(prepHours) {
  return prepHours > 10 ? 14 : 7;
}

// Calculates the exact prep window for an exam in code, so the AI doesn't have to do date math
function getPrepWindow(examDate, prepHours) {
  const today = startOfDay(new Date());
  const exam = startOfDay(examDate);

  const end = new Date(exam);
  end.setDate(end.getDate() - 1); // last prep day = day before the exam

  let start = new Date(exam);
  start.setDate(start.getDate() - getWindowDays(prepHours));
  if (start < today) start = today;
  if (end < start) return { start: toDateString(today), end: toDateString(today), days: 1 };

  const days = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return { start: toDateString(start), end: toDateString(end), days };
}

// Estimates total hours for a task from its title + difficulty. Never throws.
async function estimateTaskHours(title, difficulty) {
  const fallback = DEFAULT_TASK_HOURS[difficulty] || 6;

  const prompt = `You estimate how long university assignments take for a typical student.
Task: "${title}"
Difficulty: ${difficulty}

Estimate the total hours of work needed to fully complete this task.
Return ONLY a JSON object, with no additional text, in this exact format:
{"hours": number}
The number must be a whole number between ${MIN_SESSION_HOURS} and 40.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: prompt
    });
    const cleaned = response.text.replace(/```json|```/g, '').trim();
    const hours = Math.round(Number(JSON.parse(cleaned).hours));
    if (!hours || hours < MIN_SESSION_HOURS || hours > 40) return fallback;
    return hours;
  } catch (err) {
    console.error('Task hour estimation failed, using default:', err.message);
    return fallback;
  }
}

function buildPrompt(tasks, exams, weeklyAvailability, constraints) {
  const tasksText = tasks
    .map(t => `- ${t.title} | Deadline: ${toDateString(t.deadline)} | Difficulty: ${t.difficulty} | Duration: ${t.durationHours} hours`)
    .join('\n') || 'None';

  const examsText = (exams || [])
    .map(e => {
      const w = getPrepWindow(e.date, e.prepHoursNeeded);
      return `- "${e.subject} exam prep" | Exam date: ${toDateString(e.date)} | Difficulty: ${e.difficulty} | Total prep: ${e.prepHoursNeeded} hours | PREP WINDOW: ${w.start} to ${w.end} (${w.days} days)`;
    })
    .join('\n') || 'None';

  const availabilityText = Object.entries(weeklyAvailability)
    .map(([day, hours]) => `${day}: ${hours} hours`)
    .join('\n');

  const constraintsText = constraints
    ? Object.entries(constraints).map(([k, v]) => `${k}: ${v}`).join(', ')
    : 'None';

  const today = toDateString(new Date());

  return `You are a study planner. Today's date is ${today}. Never schedule any date before ${today}.

Real available study hours per day of the week (already accounts for sleep, commuting, and recurring commitments like gym or classes):
${availabilityText}

Other constraints: ${constraintsText}

TASKS (ordered by priority):
${tasksText}
Rules for tasks: start early and split the hours into a few sessions on different days before the deadline. Every task must be fully scheduled on or before its deadline.

EXAMS:
${examsText}
Rules for exams (follow strictly):
1. Schedule prep sessions ONLY inside that exam's PREP WINDOW (from its start date to its end date, inclusive). Never before the start date.
2. Spread the sessions across the whole window. Do NOT finish early and leave the last days before the exam empty.
3. The LAST prep session must be on the window's end date (the day before the exam), and it should be one of the longest sessions.
4. It is fine to skip days inside the window — fewer, longer sessions are better than many short ones.
5. The prep hours for each exam must add up exactly to its total prep hours.
6. Use the exam's task name exactly as written in quotes (e.g. "math exam prep").

SESSION LENGTH RULES (apply to every entry, tasks and exams):
- Hours must be WHOLE numbers only (no 0.5, no decimals).
- Every session must be between ${MIN_SESSION_HOURS} and ${MAX_SESSION_HOURS} hours. Never schedule a 1-hour session.

GENERAL RULES:
- Never exceed the available hours for that day of the week, counting ALL tasks and exam prep scheduled on that day combined.
- If a day has several items, list each as a separate entry with the same date.

Return ONLY a JSON object, with no additional text, in this exact format:
{
  "schedule": [
    {"date": "YYYY-MM-DD", "task": "task title", "hours": number}
  ]
}`;
}

async function generateSchedule(tasks, exams, weeklyAvailability, constraints, retries = 3) {
  const prompt = buildPrompt(tasks, exams, weeklyAvailability, constraints);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: prompt
      });

      const text = response.text;
      const cleaned = text.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);

    } catch (err) {
      const isOverloaded = err.message?.includes('UNAVAILABLE') || err.message?.includes('503');
      if (isOverloaded && attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw new Error('Gemini request failed: ' + err.message);
    }
  }
}

module.exports = { generateSchedule, estimateTaskHours };