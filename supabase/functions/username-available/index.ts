import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (displayName.length < 1 || displayName.length > 40) return json({ available: false });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  let currentUserId: string | null = null;
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (token) {
    const { data } = await admin.auth.getUser(token);
    currentUserId = data.user?.id ?? null;
  }

  const escaped = displayName.replace(/[\\%_]/g, (value) => `\\${value}`);
  const { data, error } = await admin.from("forge_profiles").select("user_id,display_name").ilike("display_name", escaped).limit(20);
  if (error) return json({ error: "Availability check failed" }, 500);
  const normalized = displayName.toLocaleLowerCase();
  const taken = (data ?? []).some((profile) => profile.user_id !== currentUserId && profile.display_name.trim().toLocaleLowerCase() === normalized);
  return json({ available: !taken });
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

