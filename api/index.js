import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge', // Runs on the fastest servers
};

export default async function handler(req) {
  // 1. Handle "Pre-flight" checks (CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // 2. Health Check
  if (req.method === 'GET') {
    return new Response("Gemini 2.0 Flash Bridge is Live! 🚀", { status: 200 });
  }

  try {
    // 3. Setup Gemini 2.0 Flash
    // Make sure your API Key is set in Vercel Settings
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 4. Parse Incoming Data
    const data = await req.json();
    const messages = data.messages || [];
    // Get the user's last message
    const lastMsg = messages.reverse().find(m => m.role === 'user')?.content || "Hello";

    // 5. Ask Gemini (With a "HUD" System Prompt for speed)
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', 
      contents: [{ 
        role: "user", 
        parts: [{ 
          text: `You are an AI assistant for smart glasses (HUD). 
                 Keep your answer extremely concise, short, and conversational. 
                 Do not use markdown formatting (no bold/italics). 
                 Max 2 sentences.
                 User asks: ${lastMsg}` 
        }] 
      }],
    });

    // 6. Send Response back to Glasses
    const answer = response.text; 

    return new Response(JSON.stringify({
      choices: [{
        message: { role: "assistant", content: answer }
      }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
