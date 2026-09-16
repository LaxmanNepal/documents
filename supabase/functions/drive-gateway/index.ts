import { createClient } from "npm:@supabase/supabase-js@2";
import { createFolder, deleteFile, downloadFile, getFile, listFiles, trashFile, uploadFile } from "./drive.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

const config = () => ({
  clientId: Deno.env.get("GOOGLE_CLIENT_ID")!,
  clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
  refreshToken: Deno.env.get("GOOGLE_REFRESH_TOKEN")!,
  rootFolderId: Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID") || undefined,
});

function configured() {
  return Boolean(Deno.env.get("GOOGLE_CLIENT_ID") && Deno.env.get("GOOGLE_CLIENT_SECRET") && Deno.env.get("GOOGLE_REFRESH_TOKEN"));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return json({ error: "Unauthorized" }, 401);
  if (!configured()) return json({ error: "Google Drive backend is not configured yet." }, 503);

  try {
    if (req.method === "GET") {
      return json({ ok: true, provider: "google-drive", configured: true, rootFolderConfigured: Boolean(Deno.env.get("GOOGLE_DRIVE_ROOT_FOLDER_ID")) });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const body = await req.json().catch(() => null);
    const action = body?.action;
    const drive = config();

    if (action === "list") return json({ ok: true, ...(await listFiles(drive, body.pageToken)) });
    if (action === "get") return json({ ok: true, file: await getFile(drive, body.fileId) });
    if (action === "folder") return json({ ok: true, folder: await createFolder(drive, body.name, body.parentId) });
    if (action === "trash") return json({ ok: true, file: await trashFile(drive, body.fileId) });
    if (action === "delete") return json({ ok: true, ...(await deleteFile(drive, body.fileId)) });
    if (action === "download") {
      const response = await downloadFile(drive, body.fileId);
      if (!response.ok) return json({ error: `Drive download failed: ${response.status}` }, response.status);
      return new Response(response.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
          ...(response.headers.get("Content-Length") ? { "Content-Length": response.headers.get("Content-Length")! } : {}),
          "Cache-Control": "private, no-store",
        },
      });
    }
    if (action === "upload") {
      const form = await req.formData();
      const file = form.get("file");
      const folderId = String(form.get("folderId") || "");
      if (!(file instanceof File)) return json({ error: "file is required" }, 400);
      const uploaded = await uploadFile(drive, file, folderId || undefined);
      return json({ ok: true, file: uploaded });
    }
    return json({ error: "Unsupported Drive action" }, 400);
  } catch (err) {
    console.error("drive-gateway", err);
    return json({ error: err instanceof Error ? err.message : "Google Drive operation failed" }, 500);
  }
});
