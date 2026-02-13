import { GoogleGenerativeAI } from "@google/generative-ai";

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
    return new Response("VERIFIED: 2026 BRAIN ACTIVE 🌐", { status: 200 });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const data = await req.json();
    const lastMsg = data.messages?.reverse().find(m => m.role === 'user')?.content || "Hello";

    const now = new Date().toLocaleString("en-US", { 
      timeZone: "America/Chicago",
      dateStyle: "full",
      timeStyle: "short"
    });

    // Get model with grounding configuration
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      systemInstruction: `You are a HUD assistant. Today is ${now}.
CRITICAL RULES:
- You MUST search Google for ALL factual questions about current events, sports, news, dates
- NEVER answer from memory - always search first
- Be concise: max 15 words
- If asked about year, search current date
- If asked about sports, search latest results`
    });

    // Enable Google Search grounding
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `[SEARCH REQUIRED] ${lastMsg}` }] 
      }],
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.3
          }
        }
      }]
    });

    const response = await result.response;
    let answer = response.text();
    
    // Clean up response
    answer = answer
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*/g, "")
      .trim();

    // Validation check
    if ((lastMsg.toLowerCase().includes('year') || lastMsg.toLowerCase().includes('super bowl')) 
        && (answer.includes('2024') || answer.includes('Chiefs'))) {
      answer = "⚠️ Search failed. Try: 'What year is it' or 'Latest Super Bowl winner'";
    }

    return new Response(JSON.stringify({
      choices: [{ 
        message: { 
          role: "assistant", 
          content: answer || "Processing your request..."
        } 
      }]
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json', 
        'Access-Control-Allow-Origin': '*' 
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
