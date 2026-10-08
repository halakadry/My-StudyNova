const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// history: [{ role: 'user' | 'assistant', text }]
async function askAssistant(systemInstruction, history, retries = 3) {
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-lite-latest',
        contents,
        config: { systemInstruction },
      });
      return response.text;
    } catch (err) {
      const isOverloaded = err.message?.includes('UNAVAILABLE') || err.message?.includes('503');
      if (isOverloaded && attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
        continue;
      }
      throw new Error('Gemini request failed: ' + err.message);
    }
  }
}

module.exports = { askAssistant };