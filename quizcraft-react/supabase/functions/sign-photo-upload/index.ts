import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { quiz_id, attempt_id } = await req.json();
  if (!quiz_id || !attempt_id) {
    return new Response(JSON.stringify({ message: "quiz_id and attempt_id are required" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  const objectPath = `quiz/${quiz_id}/attempt/${attempt_id}.jpg`;

  const { data, error } = await supabase.storage
    .from("student-photos")
    .createSignedUploadUrl(objectPath);

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ path: objectPath, ...data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
