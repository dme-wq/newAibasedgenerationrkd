import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export interface GenerationSettings {
  category: string;
  style: string;
  room: string;
}

/**
 * Helper to convert File to base64 for Gemini Vision
 */
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
}

/**
 * Step 1: Analyze the product image and generate 5 highly specific, hyper-realistic Imagen 3 prompts.
 */
export async function generatePrompts(file: File, settings: GenerationSettings): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const imagePart = await fileToGenerativePart(file);

  const systemPrompt = `You are a world-class AI Prompt Engineer specializing in photorealistic architectural and interior photography.
Your task is to analyze the provided product image and generate exactly 5 distinct text-to-image prompts for Imagen 4.0.
The user wants to generate stunning, photorealistic EMPTY room settings where their product will be placed later via compositing.

Product Category (for context): ${settings.category}
Style Preference: ${settings.style}
Room Setting: ${settings.room}

INSTRUCTIONS:
1. Understand the product category and size to determine the scale of the empty space needed.
2. Create 5 drastically different, empty lifestyle photography backgrounds. The prompts MUST describe an EMPTY floor or surface in the ${settings.room} designed in the "${settings.style}" style.
3. The space MUST be empty where the product will go. For example, if it's a bath mat, describe a beautiful bathroom floor with an empty space in front of the tub or shower.
4. DO NOT MENTION THE PRODUCT ITSELF in the prompt! If you say "a maroon rug", Imagen will generate a rug. You must describe the room, the lighting, the floor texture, and explicitly state it is an empty floor/surface ready for an item to be placed.
5. Provide different camera angles for the 5 prompts:
   - Angle 1: Top-down flat lay view of the empty floor surface.
   - Angle 2: 45-degree angle looking down at the empty space with cinematic lighting.
   - Angle 3: Low-angle perspective looking across the empty floor towards a light source.
   - Angle 4: Wide-angle shot showing more of the room, with a clear empty space on the floor.
   - Angle 5: Close-up angle of the empty floor texture with beautiful shallow depth of field (bokeh) in the background.

Return ONLY a valid JSON array of 5 strings. No markdown, no intro.
Example:
[
  "A photorealistic top-down view of an empty luxury marble floor in a ${settings.style} ${settings.room}. The floor is completely clear and empty in the center, with soft natural light coming from a window off-camera. 8k, highly detailed.",
  "A cinematic 45-degree angle shot of an empty polished concrete floor in a ${settings.room}. The center space is completely empty. Soft, warm ambient lighting illuminates the surface.",
  ...
]`;

  const result = await model.generateContent([systemPrompt, imagePart]);
  const text = result.response.text().trim();
  
  try {
    // Strip markdown formatting if any
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '');
    const prompts = JSON.parse(jsonStr);
    if (Array.isArray(prompts) && prompts.length === 5) {
      return prompts;
    }
    throw new Error('Invalid array length');
  } catch (error) {
    console.error('Failed to parse Gemini prompts', text);
    throw new Error('Failed to generate prompts correctly.');
  }
}

/**
 * Step 2: Call Imagen 4 REST API to generate the image
 */
export async function generateImagen3(prompt: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 1,
        aspectRatio: '1:1'
      }
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Imagen API Error:', errText);
    throw new Error('Failed to generate image from Google API');
  }

  const data = await response.json();
  
  // The API typically returns predictions[0].bytesBase64Encoded
  if (data.predictions && data.predictions.length > 0) {
    const base64 = data.predictions[0].bytesBase64Encoded;
    return `data:image/jpeg;base64,${base64}`;
  }
  
  throw new Error('Invalid response from Imagen 3 API');
}
