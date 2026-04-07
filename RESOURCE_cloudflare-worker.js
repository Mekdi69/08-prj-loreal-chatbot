// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST requests from the front-end.
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: corsHeaders },
      );
    }

    if (!env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY in Worker secrets." }),
        { status: 500, headers: corsHeaders },
      );
    }

    let userInput;
    try {
      userInput = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!Array.isArray(userInput.messages) || userInput.messages.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Request body must include a messages array.",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const requestBody = {
      model: "gpt-4o",
      messages: userInput.messages,
      max_completion_tokens: 300,
    };

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        const openAIError = data?.error?.message || "OpenAI request failed.";
        return new Response(JSON.stringify({ error: openAIError }), {
          status: response.status,
          headers: corsHeaders,
        });
      }

      // Return model response JSON to the front-end (no API key is exposed).
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: corsHeaders,
      });
    } catch {
      return new Response(
        JSON.stringify({ error: "Server error while contacting OpenAI." }),
        { status: 500, headers: corsHeaders },
      );
    }
  },
};
