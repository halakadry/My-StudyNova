const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function buildPrompt(tasks, exams, availableHoursPerDay, constraints) {
  const tasksText = tasks
    .map(t => `- ${t.title} | Deadline: ${t.deadline.toISOString().split('T')[0]} | Difficulty: ${t.difficulty} | Duration: ${t.durationHours} hours`)
    .join('\n');

  const examsText = (exams || [])
    .map(e => `- ${e.subject}: ${e.date}`)
    .join('\n') || 'None';

  const constraintsText = constraints
    ? Object.entries(constraints).map(([k, v]) => `${k}: ${v}`).join(', ')
    : 'None';

  return `You are a study planner. Create a study schedule for a student with the following tasks and constraints. Return the result as a JSON object only, with no additional text.

Available study hours per day: ${availableHoursPerDay} hours

Constraints: ${constraintsText}

Tasks (ordered by priority):
${tasksText}

Exams:
${examsText}

Generate a day-by-day study schedule from today until all tasks are completed. Do not assign more than ${availableHoursPerDay} hours per day. Prioritize tasks with earlier deadlines and higher priority scores.

Return JSON in this exact format:
{
  "schedule": [
    {"date": "YYYY-MM-DD", "task": "task title", "hours": number}
  ]
}`;
}

async function generateSchedule(tasks, exams, availableHoursPerDay, constraints, retries = 3) {
  const prompt = buildPrompt(tasks, exams, availableHoursPerDay, constraints);

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
        await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // wait 2s, then 4s
        continue;
      }
      throw new Error('Gemini request failed: ' + err.message);
    }
  }
}

module.exports = { generateSchedule };