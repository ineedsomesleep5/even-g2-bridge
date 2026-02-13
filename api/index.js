import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: 'edge', 
};

// Helper function to search Brave
async function braveSearch(query) {
  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': process.env.BRAVE_API_KEY
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Brave Search failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Extract relevant results
  const results = data.web?.results?.slice(0, 3) || [];
  return results.map(r => `${r.title}: ${r.description}`).join('\n');
}

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
    return new Response("VERIFIED: 2026 BRAIN ACTIVE 🌐 (Brave Search)", { status: 200 });
  }

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const data = await req.json();
    const lastMsg = data.messages?.reverse().find(m => m.role === 'user')?.content || "Hello";

    const now = new Date();
    const dateStr = now.toLocaleString("en-US", { 
      timeZone: "America/Chicago",
      dateStyle: "full",
      timeStyle: "short"
    });

    // Detect if this needs a search
    const needsSearch = 
      /what year|current year|today|date|who won|super bowl|score|latest|recent|news|current/i.test(lastMsg);

    let searchResults = "";
    
    if (needsSearch) {
      try {
        searchResults = await braveSearch(lastMsg);
      } catch (searchError) {
        console.error('Search error:', searchError);
        searchResults = "[Search failed - answering without search]";
      }
    }

    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview",
      systemInstruction: `You are a concise HUD assistant.
Current time: ${dateStr}

Rules:
- Keep all responses under 15 words
- Be direct and factual
- If search results are provided, use them as your primary source
- Don't mention the search or say "according to"
- Just give the answer`
    });

    const prompt = searchResults 
      ? `Search results for "${lastMsg}":\n${searchResults}\n\nBased on these results, answer the question in under 15 words:`
      : lastMsg;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let answer = response.text();
    
    // Minimal cleanup
    answer = answer
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\*\*/g, "")
      .replace(/According to.*?[,:]/gi, "")
      .trim();

    return new Response(JSON.stringify({
      choices: [{ 
        message: { 
          role: "assistant", 
          content: answer || "Unable to answer"
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
      choices: [{
        message: {
          role: "assistant",
          content: "Service error. Try again."
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
}
