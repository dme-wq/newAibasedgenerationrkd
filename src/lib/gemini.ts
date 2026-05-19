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

  const systemPrompt = `You are a world-class AI Prompt Engineer specializing in photorealistic product photography. 
Your task is to analyze the provided product design image and generate exactly 5 distinct text-to-image prompts.
The user wants to generate lifestyle images of the product. The product MUST be replicated with 100% accuracy in the final generated image.

Product Category: ${settings.category}
Style Preference: ${settings.style}
Room Setting: ${settings.room}

INSTRUCTIONS:
1. Deeply analyze the uploaded image: identify exact colors, textures, patterns, logos, and materials.
2. Create 5 drastically different lifestyle photography prompts. They should all feature the exact product, but from different camera angles, lighting conditions, and specific placements within the ${settings.room}.
3. The style should be strictly "${settings.style}".
4. Write the prompts so they can be fed directly to Imagen 3.
5. Emphasize in the prompt that the product MUST look identical to the uploaded design (describe the design deeply in each prompt).

Return ONLY a valid JSON array of 5 strings. No markdown, no intro.
Example:
[
  "A hyper-realistic, 8k resolution lifestyle shot of a [Category] with [exact pattern/color described] placed in a ${settings.style} ${settings.room}. The camera angle is a wide shot showing the entire room with natural sunlight pouring in from a window. Cinematic lighting, photorealistic.",
  "An extreme close-up macro photography shot of the same [Category], highlighting the rich [texture] and [colors]. It is placed on a [surface] in a ${settings.room} setting with soft ambient lighting.",
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
