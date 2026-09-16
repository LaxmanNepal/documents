import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Secure server-side gateway for Google Drive.
 *
 * Secrets are intentionally read only from the Edge Function environment:
 * GOOGLE_CLIENT_ID
 * GOOGLE_CLIENT_SECRET
 * GOOGLE_REFRESH_TOKEN
 * GOOGLE_DRIVE_ROOT_FOLDER_ID (optional)
 *
 * The browser never receives the refresh token or client secret.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) {
    return json({ error: "Google Drive backend is not configured yet." }, 503);
  }

  if (req.method === "GET") {
    return json({
      ok: true,
      provider: "google-drive",
      configured: true,
      rootFolderConfigured: Boolean(Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID")),
      userId: user.id,
    });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const allowed = new Set(["status", "list", "create-folder", "upload", "download", "trash", "delete"]);
  if (!allowed.has(action)) return json({ error: "Unsupported Drive action" }, 400);

  // Drive operations will be added behind this authenticated gateway.
  // Keeping the provider boundary here prevents Drive credentials from ever
  // reaching app.js and makes the storage provider replaceable later.
  return json({
    ok: false,
    action,
    message: "Drive operation endpoint is ready; configure OAuth secrets before enabling file operations.",
  }, 501);
});
