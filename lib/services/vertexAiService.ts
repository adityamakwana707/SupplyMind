import { VertexAI, HarmCategory, HarmBlockThreshold } from '@google-cloud/vertexai';

const project = process.env.GOOGLE_CLOUD_PROJECT || 'stockmaster-b1d3e';
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

const vertexAI = new VertexAI({ project, location });

const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  safetySettings: [
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
  ],
  generationConfig: { maxOutputTokens: 2048 },
});

export async function generateDecision(prompt: string) {
  try {
    const result = await generativeModel.generateContent(prompt);
    const response = await result.response;
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return text;
  } catch (error) {
    console.error('Vertex AI Error:', error);
    // Fallback logic could go here
    return null;
  }
}
