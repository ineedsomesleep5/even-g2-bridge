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

  // ✅ DEBUG TEST: Open your Vercel URL in a browser. 
  // It should say "VERIFIED: 2026 BRAIN ACTIVE". 
  // If it doesn't, Vercel hasn't updated yet.
  if (req.method === 'GET') {
    return new Response("VERIFIED: 2026 BRAIN ACTIVE 🌐", { status: 200 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const data = await req.json();
    const lastMsg = data.messages?.reverse().find(m => m.role === 'user')?.content || "Hello";

    // ✅ FORCE THE CLOCK
    const now = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash', 
      tools: [{ googleSearch: {} }],
      systemInstruction: `
        THE YEAR IS ${now}. 
        You are a HUD assistant. 
        MANDATORY: You are FORBIDDEN from answering sports, news, or date questions from memory.
        You MUST execute a Google Search for every factual question.
        If you say '2024' or 'Chiefs' you have failed. Search to find the 2026 truth.
        Output ONLY the final answer in plain text. Max 15 words.`,
      contents: [{ role: "user", parts: [{ text: `Search Google and answer: ${lastMsg}` }] }],
    });

    let answer = response.text;
    if (answer) {
        answer = answer.replace(/```[\s\S]*?```/g, "").trim();
        answer = answer.replace(/\{[\s\S]*?\}/g, "").trim();
    }

    return new Response(JSON.stringify({
      choices: [{ message: { role: "assistant", content: answer || "I'm searching, ask again." } }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
