import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders() });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Please sign in first." }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ error: "Invalid session." }, 401);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "AI server key is not configured yet." }, 500);

    const body = await req.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const safeMessages = messages
      .filter((m: any) => ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-30)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 6000) }));

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are KIDUS AI, a helpful, clear, friendly personal AI assistant. Keep answers useful and age-appropriate." },
          ...safeMessages
        ],
        max_tokens: 900
      })
    });
    const result = await response.json();
    if (!response.ok) {
      return json({ error: result?.error?.message || "The AI provider request failed." }, 502);
    }
    return json({ reply: result.choices?.[0]?.message?.content || "I couldn't create a reply." });
  } catch (error) {
    return json({ error: error.message || "Unexpected server error." }, 500);
  }
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };
}
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders(), "Content-Type": "application/json" }
  });
}
