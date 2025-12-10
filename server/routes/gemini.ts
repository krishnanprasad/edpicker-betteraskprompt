import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const router = express.Router();

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not set. Requests to /api/gemini/analyze will fail.');
}
const genAI = new GoogleGenAI({ apiKey });

const schema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER, description: "A score from 0-100 evaluating the prompt's quality." },
    feedback: { type: Type.STRING, description: "Constructive feedback explaining the score and suggesting areas for improvement." },
    improvedPrompt: {
      type: Type.OBJECT,
      description: "A structured, improved version of the student's prompt.",
      properties: {
        role: { type: Type.STRING },
        context: { type: Type.STRING },
        task: { type: Type.STRING },
        exemplars: { type: Type.ARRAY, items: { type: Type.STRING } },
        persona: { type: Type.STRING },
        format: { type: Type.STRING },
        tone: { type: Type.STRING },
      },
      required: ["task"]
    }
  },
  required: ["score", "feedback", "improvedPrompt"]
};

router.post('/analyze', async (req: Request, res: Response) => {
  const { studentPrompt } = req.body;
  if (!studentPrompt) return res.status(400).json({ error: 'studentPrompt is required' });

  try {
    const systemInstruction = `You are an expert prompt engineering coach for high school and college students. Your goal is to analyze a student's prompt and help them improve it for better results.`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Please analyze this student's prompt: "${studentPrompt}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: schema,
        temperature: 0.3,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    const jsonText = (response.text || '').trim();
    const parsedResponse = JSON.parse(jsonText);

    const improvedPrompt = parsedResponse.improvedPrompt || {};

    const output = {
      ...parsedResponse,
      improvedPrompt: {
        role: improvedPrompt.role || null,
        context: improvedPrompt.context || null,
        task: improvedPrompt.task || studentPrompt,
        exemplars: improvedPrompt.exemplars || null,
        persona: improvedPrompt.persona || null,
        format: improvedPrompt.format || null,
        tone: improvedPrompt.tone || null,
      }
    };

    res.json(output);
  } catch (error) {
    console.error('Error analyzing prompt:', error);
    res.status(500).json({ error: 'Failed to get analysis from Gemini API.' });
  }
});

export default router;
