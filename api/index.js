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
    return new Response("VERIFIED: 2026 BRAIN ACTIVE 🌐 (Gemini 3 Flash)", { status: 200 });
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
      systemInstruction: `CRITICAL CONTEXT:
Today's date is ${dateStr}. Current year: ${now.getFullYear()}.

IMPORTANT FACTS:
- Year: ${now.getFullYear()}
- Recent Super Bowl winner: New England Patriots defeated Seattle Seahawks
- Patriots QB: Drake Maye, Seahawks QB: Sam Darnold

RULES:
- Keep responses under 15 words
- For current events/sports: search Google first
- Never say "2024" or "Chiefs"
- Be concise and natural`
    });

    // Try with grounding
    let result;
    try {
      result = await model.generateContent({
        contents: [{ 
          role: "user", 
          parts: [{ text: lastMsg }] 
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
    } catch (groundingError) {
      // Fallback without grounding if not supported
      console.log('Grounding not available, using standard generation');
      result = await model.generateContent(lastMsg);
    }

    const response = await result.response;
    let answer = response.text();
    
    // Clean up
    answer = answer
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*/g, "")
      .replace(/2024/g, "2026")
      .replace(/Chiefs/gi, "Patriots")
      .trim();

    // Hard-coded fallbacks for accuracy
    const lowerMsg = lastMsg.toLowerCase();
    if (lowerMsg.includes('what year') || lowerMsg.includes('current year')) {
      answer = "It's 2026";
    } else if (lowerMsg.includes('super bowl') && (lowerMsg.includes('won') || lowerMsg.includes('winner'))) {
      answer = "Patriots beat Seahawks in Super Bowl LX";
    } else if (lowerMsg.match(/what.*date|today.*date|current date/)) {
      const shortDate = now.toLocaleDateString("en-US", { 
        month: "long", 
        day: "numeric", 
        year: "numeric" 
      });
      answer = shortDate;
    }

    return new Response(JSON.stringify({
      choices: [{ 
        message: { 
          role: "assistant", 
          content: answer || "Processing..."
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
    
    // Provide helpful error message
    if (error.message.includes('not found') || error.message.includes('404')) {
      return new Response(JSON.stringify({ 
        error: "Gemini 3 Flash Preview not available",
        suggestion: "Check if your API key has access to preview models",
        modelTried: "gemini-3-flash-preview",
        details: error.message
      }), { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      stack: error.stack
    }), { 
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
