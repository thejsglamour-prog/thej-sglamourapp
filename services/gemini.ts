import { ChatMessage } from '../types';

// Client-side shim: calls the serverless /api/genai endpoint.
// We keep the same exported async generator signature used by the UI, but yield the full reply once.
export async function* getStyleAdviceStream(history: ChatMessage[]) {
  try {
    const response = await fetch('/api/genai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err || 'AI endpoint error');
    }

    const data = await response.json();
    const text = data.text || 'Aesthetic calibration interrupted. Please contact the flagship node.';

    // Single-chunk yield to preserve current consumer pattern
    yield text;
  } catch (error) {
    console.error('AI client failure:', error);
    yield "Aesthetic calibration interrupted. Please refresh the protocol or contact the flagship node at 09011846464.";
  }
}
