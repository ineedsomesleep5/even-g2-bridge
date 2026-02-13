import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
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

  if (req.method === 'GET') {
    return new Response("Gemini 2.0 Flash (Search Enforced) is Live! 🔍", { status: 200 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const data = await req.json();
    const messages = data.messages || [];
    const lastMsg = messages.reverse().find(m => m.role === 'user')?.content || "Hello";

    // Get current date
    const now = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', 
      
      // ✅ TOOL ENABLED:
      tools: [{ googleSearch: {} }],

      contents: [{ 
        role: "user", 
        parts: [{ 
          // ✅ PROMPT UPDATED: We force it to verify facts
          text: `System: Current Date/Time is ${now}.
                 You are a HUD assistant.
                 CRITICAL RULE: If the user asks about sports, news, or recent events, you MUST use the 'googleSearch' tool. 
                 DO NOT guess. DO NOT answer from memory. SEARCH FIRST.
                 
                 After searching, give a extremely concise answer (max 15 words).
                 User asks: ${lastMsg}` 
        }] 
      }],
    });

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
