import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge', 
};

export default async function handler(req) {
  // 1. Handle CORS and Health Checks
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
    return new Response("Gemini 2.0 Flash (Live Search Enforced) is Active! 🌐", { status: 200 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const data = await req.json();
    const messages = data.messages || [];
    const lastMsg = messages.reverse().find(m => m.role === 'user')?.content || "Hello";

    // ✅ Inject real-time date for context
    const now = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', 
      
      // ✅ Enables Google Search Grounding
      tools: [{ googleSearch: {} }],

      // ✅ Strict System Instructions to prevent "guessing"
      systemInstruction: `
        Current Date/Time: ${now}.
        You are an AI assistant for smart glasses (HUD).
        RULES:
        1. If the user asks about sports, news, weather, or current events, YOU MUST USE THE GOOGLE SEARCH TOOL.
        2. DO NOT answer from your memory for recent events (like Super Bowls or dates).
        3. Never output JSON, technical tool-code, or markdown (no bold/italics).
        4. Keep your final answer conversational and under 15 words.
      `,

      contents: [{ 
        role: "user", 
        parts: [{ text: lastMsg }] 
      }],
    });

    // ✅ Safety Cleaner: Removes JSON or tool code if the AI leaks it
    let answer = response.text;
    if (answer) {
        answer = answer.replace(/```[\s\S]*?```/g, "").trim();
        answer = answer.replace(/\{"function_call":[\s\S]*?\}/g, "").trim();
        answer = answer.replace(/\{"reply":[\s\S]*?\}/g, "").trim();
    }

    if (!answer) answer = "Searching... please try that question again.";

    return new Response(JSON.stringify({
      choices: [{
        message: { role: "assistant", content: answer }
      }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      choices: [{
        message: { role: "assistant", content: "System Error: " + error.message.substring(0, 40) }
      }]
    }), { status: 200 });
  }
}
