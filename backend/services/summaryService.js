const { GoogleGenAI } = require('@google/genai');
const mammoth = require('mammoth');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const MAX_TEXT_CHARS = 120000; // keep very long Word/text files within limits

const LANGUAGE_RULE = {
  auto: 'Write everything in the same language as the material.',
  English: 'Write everything in English.',
  Hebrew: 'Write everything in Hebrew.',
  Arabic: 'Write everything in Arabic.',
};

function buildPrompt(language) {
  return `You are a study assistant for university students. Read the attached lecture material and help the student study it.
${LANGUAGE_RULE[language] || LANGUAGE_RULE.auto}

Return ONLY a JSON object, with no extra text, in exactly this format:
{
  "title": "short title of the material",
  "summary": "a clear summary in 1-3 short paragraphs, paragraphs separated by \\n\\n",
  "keyPoints": ["5 to 10 key points, each one short sentence"],
  "questions": [{"question": "practice question", "answer": "short correct answer"}]
}

Rules:
- Exactly 5 practice questions that test understanding, not only memorization.
- Use only information from the material. Do not invent facts.
- Plain text only. No markdown symbols like ** or #.`;
}

// Turns the uploaded file into something Gemini can read
async function fileToParts(file) {
  const name = (file.originalname || '').toLowerCase();

  // PDF: Gemini reads it directly (text + slides)
  if (file.mimetype === 'application/pdf' || name.endsWith('.pdf')) {
    return [{ inlineData: { mimeType: 'application/pdf', data: file.buffer.toString('base64') } }];
  }

  let text;
  if (name.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ buffer: file.buffer });
    text = value;
  } else if (name.endsWith('.txt')) {
    text = file.buffer.toString('utf8');
  } else {
    throw new Error('UNSUPPORTED');
  }

  if (!text || !text.trim()) throw new Error('EMPTY');
  return [{ text: `LECTURE MATERIAL:\n${text.slice(0, MAX_TEXT_CHARS)}` }];
}

// Makes sure the result always has the expected shape
function normalize(data) {
  return {
    title: String(data.title || 'Summary'),
    summary: String(data.summary || ''),
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.map(String) : [],
    questions: Array.isArray(data.questions)
      ? data.questions
          .filter((q) => q && q.question)
          .map((q) => ({ question: String(q.question), answer: String(q.answer || '') }))
      : [],
  };
}

async function summarizeFile(file, language = 'auto', retries = 3) {
  const parts = [...(await fileToParts(file)), { text: buildPrompt(language) }];

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents: [{ role: 'user', parts }],
        config: { responseMimeType: 'application/json' },
      });
      const cleaned = response.text.replace(/```json|```/g, '').trim();
      return normalize(JSON.parse(cleaned));
    } catch (err) {
      const isOverloaded = err.message?.includes('UNAVAILABLE') || err.message?.includes('503');
      if (isOverloaded && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw err;
    }
  }
}

module.exports = { summarizeFile };