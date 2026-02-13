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
    return new Response("Gemini Bridge (Silent Search) is Live! 🤫", { status: 200 });
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
      
      // ✅ Enable Search
      tools: [{ googleSearch: {} }],

      // ✅ SYSTEM INSTRUCTION: This forces the AI to hide the tool code
      systemInstruction: `
        Current Date: ${now}.
        You are a HUD assistant.
        1. If you need to verify facts (like sports/news), use Google Search silently.
        2. NEVER output JSON, XML, or "Tool Code". 
        3. ONLY output the final plain text answer.
        4. Keep it under 20 words.
      `,

      contents: [{ 
        role: "user", 
        parts: [{ text: lastMsg }] 
      }],
    });

    // ✅ CLEANER: This strips out any accidental code blocks
    let answer = response.text;
    
    // Safety: If the AI sends raw code, this removes it
    if (answer) {
        answer = answer.replace(/```[\s\S]*?```/g, "").trim(); // Remove code blocks
        answer = answer.replace(/\{"function_call":[\s\S]*?\}/g, "").trim(); // Remove JSON artifacts
    }

    // Fallback if search failed to generate text
    if (!answer) {
        answer = "I found the info but couldn't summarize it. Try asking again.";
    }

    return new Response(JSON.stringify({
      choices: [{
        message: { role: "assistant", content: answer }
      }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    // If it crashes, tell the user why
    return new Response(JSON.stringify({
      choices: [{
        message: { role: "assistant", content: "Search Error: " + error.message.substring(0, 50) }
      }]
    }), { status: 200 });
  }
}
