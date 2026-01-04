// Serverless endpoint for Vercel/Netlify that proxies AI requests to Google GenAI.
// Expects process.env.GENAI_API_KEY to be set on the server (do NOT commit keys).
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GENAI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { history, promptOverride } = req.body || {};

    // Build prompt from history (fall back to promptOverride if provided)
    let prompt: string;
    if (promptOverride && typeof promptOverride === 'string') {
      prompt = promptOverride;
    } else if (Array.isArray(history)) {
      prompt = history.map((m: any) => `${m.role === 'user' ? 'User' : 'System'}: ${m.text}`).join('\n') + '\n\nRespond concisely within THE J\'S GLAMOUR persona.';
    } else {
      prompt = 'You are the Master AI Concierge for THE J\'S GLAMOUR. Provide concise, technical advice.';
    }

    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { temperature: 0.7, topP: 0.95, topK: 40 }
    });

    const text = (result && (result as any).text) || '';

    return res.status(200).json({ text });
  } catch (err) {
    console.error('genai handler error:', err);
    return res.status(500).json({ error: 'AI generation failed' });
  }
}
