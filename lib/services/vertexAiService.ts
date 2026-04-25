import { GoogleGenAI } from '@google/genai';

const project = process.env.GOOGLE_CLOUD_PROJECT || 'stockmaster-b1d3e';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

const ai = new GoogleGenAI({ vertexai: true, project, location });

export async function generateDecision(prompt: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        maxOutputTokens: 2048
      }
    });
    return response.text;
  } catch (error) {
    console.error('Vertex AI Error:', error);
    // Fallback logic could go here
    return null;
  }
}
