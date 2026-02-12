import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge', // This makes it run on the fastest possible servers
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
    return new Response("Gemini Bridge (Node.js Edge) is Live! ⚡", { status: 200 });
  }

  try {
    // 3. Setup Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // 4. Parse Incoming Data
    const data = await req.json();
    const messages = data.messages || [];
    // Get the last user message
    const lastMsg = messages.reverse().find(m => m.role === 'user')?.content || "Hello";

    // 5. Ask Gemini (With a system prompt for brevity)
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: "Answer in 1 sentence for a HUD: " + lastMsg }] }],
    });
    
    const responseText = result.response.text();

    // 6. Return OpenAI Format
    return new Response(JSON.stringify({
      choices: [{
        message: { role: "assistant", content: responseText }
      }]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
