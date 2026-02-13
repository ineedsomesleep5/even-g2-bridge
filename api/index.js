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
    return new Response("VERIFIED: 2026 BRAIN ACTIVE 🌐 (Real Search Mode)", { status: 200 });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const data = await req.json();
    const lastMsg = data.messages?.reverse().find(m => m.role === 'user')?.content || "Hello";

    const now = new Date();
    const dateStr = now.toLocaleString("en-US", { 
      timeZone: "America/Chicago",
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    });

    // Gemini 3 Flash Preview
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: `You are a HUD assistant providing real-time information.
Current date: ${dateStr}

CRITICAL RULES:
1. For ANY question about current events, sports, news, dates, or facts: YOU MUST USE GOOGLE SEARCH
2. NEVER answer from memory - always search first for factual questions
3. Keep responses under 15 words
4. Be direct and concise
5. If you don't search when you should have, the user will get wrong information

Questions that REQUIRE search:
- "What year is it?" → Search current date
- "Who won the Super Bowl?" → Search Super Bowl 2026 winner
- "What's the date?" → Search today's date
- "Who won [any game]?" → Search that game result
- Any sports scores, news, or current events → ALWAYS SEARCH

Do not make up answers. Do not answer from training data. Always search for facts.`
    });

    // FORCE Google Search grounding with aggressive settings
    const result = await model.generateContent({
      contents: [{ 
        role: "user", 
        parts: [{ text: `[REAL-TIME SEARCH REQUIRED] ${lastMsg}` }] 
      }],
      tools: [{
        googleSearchRetrieval: {
          dynamicRetrievalConfig: {
            mode: "MODE_DYNAMIC",
            dynamicThreshold: 0.1  // Very low threshold = search more often
          }
        }
      }],
      generationConfig: {
        temperature: 0.3,  // Lower temperature = more factual
      }
    });

    const response = await result.response;
    let answer = response.text();
    
    // ONLY basic cleanup - NO REPLACEMENTS, NO HARD-CODED ANSWERS
    answer = answer
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*/g, "")
      .trim();

    // If answer is empty, provide helpful message
    if (!answer) {
      answer = "Unable to retrieve information. Please try again.";
    }

    return new Response(JSON.stringify({
      choices: [{ 
        message: { 
          role: "assistant", 
          content: answer
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
    
    // If grounding fails, inform user clearly
    if (error.message.includes('grounding') || error.message.includes('search')) {
      return new Response(JSON.stringify({ 
        choices: [{
          message: {
            role: "assistant",
            content: "Search unavailable. Enable search in API settings."
          }
        }]
      }), { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      details: "Check Vercel logs for full error"
    }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
