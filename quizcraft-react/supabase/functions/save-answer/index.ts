import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { attempt_id, question_id, selected_option_id, answer_text } = await req.json();
  if (!attempt_id || !question_id) {
    return new Response(JSON.stringify({ message: "attempt_id and question_id are required" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  const { error } = await supabase.rpc("save_answer_by_token", {
    p_attempt_id: attempt_id,
    p_question_id: question_id,
    p_selected_option_id: selected_option_id || null,
    p_answer_text: answer_text || null,
  });

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: "saved" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
