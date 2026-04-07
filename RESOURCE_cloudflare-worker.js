// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        { status: 405, headers: corsHeaders }
      );
    }

    if (!env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing OPENAI_API_KEY in Worker secrets." }),
        { status: 500, headers: corsHeaders }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: "Request must include a messages array." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // NEW OpenAI API endpoint
    const apiUrl = "https://api.openai.com/v1/responses";

    // NEW request format
    const requestBody = {
    model: "gpt-4o-mini",
    input: body.messages
      .map(m => `${m.role}: ${m.content}`)
      .join("\n"),
  max_output_tokens: 300,
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
        return new Response(JSON.stringify({ error: data.error?.message }), {
          status: response.status,
          headers: corsHeaders,
        });
      }

      // Convert new API format → old format expected by your front-end
      const text = data.output_text || "No response generated.";

      const formatted = {
        choices: [
          {
            message: {
              content: text,
            },
          },
        ],
      };

      return new Response(JSON.stringify(formatted), {
        status: 200,
        headers: corsHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Server error while contacting OpenAI." }),
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
 
