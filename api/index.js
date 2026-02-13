import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  // 1. Pre-flight Checks (CORS)
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
    return new Response("Gemini 2.0 Flash (Connected to Web) is Live! 🌐", { status: 200 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const data = await req.json();
    const messages = data.messages || [];
    const lastMsg = messages.reverse().find(m => m.role === 'user')?.content || "Hello";

    // Get current date for context
    const now = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });

    // 3. Ask Gemini WITH Google Search Tool
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', 
      
      // ✅ THIS IS THE MAGIC LINE that gives it web access:
      tools: [{ googleSearch: {} }],

      contents: [{ 
        role: "user", 
        parts: [{ 
          text: `System: Current Date is ${now}.
                 You are an AI assistant for smart glasses (HUD).
                 If the user asks about current events, USE SEARCH to verify.
                 Keep your answer extremely concise, short, and conversational. 
                 Do not use markdown formatting. 
                 Max 2 sentences.
                 User asks: ${lastMsg}` 
        }] 
      }],
    });

    // 4. Send Response
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
