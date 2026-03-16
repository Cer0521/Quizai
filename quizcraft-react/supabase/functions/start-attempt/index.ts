import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { token, name, photo_url } = await req.json();
  if (!token || !name) {
    return new Response(JSON.stringify({ message: "token and name are required" }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
  );

  const { data, error } = await supabase.rpc("start_attempt_by_token", {
    p_token: token,
    p_name: name,
    p_photo_url: photo_url || null,
  });

  if (error) {
    return new Response(JSON.stringify({ message: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ attempt_id: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
