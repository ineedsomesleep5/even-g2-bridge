import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge', // Keeps it fast
};

export default async function handler(req) {
  // 1. Handle CORS (Pre-flight checks)
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
    return new Response("Gemini 2.0 Flash-Lite Bridge is Live! ⚡", { status: 200 });
  }

  try {
    // 3. Setup New Google GenAI Client
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 4. Parse Incoming Data
    const data = await req.json();
    const messages = data.messages || [];
    const lastMsg = messages.reverse().find(m => m.role === 'user')?.content || "Hello";

    // 5. Ask Gemini 2.0 Flash-Lite (The Free Model)
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [{ parts: [{ text: "Answer in 1 sentence for a HUD: " + lastMsg }] }],
    });

    // 6. Send Response
    // Note: The new SDK returns the text directly in response.text
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
