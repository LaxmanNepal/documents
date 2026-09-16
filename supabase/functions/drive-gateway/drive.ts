const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";

export type DriveConfig = {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rootFolderId?: string;
};

async function accessToken(config: DriveConfig): Promise<string> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: config.refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) throw new Error(`Google OAuth failed: ${response.status}`);
  const data = await response.json();
  if (!data.access_token) throw new Error("Google OAuth did not return an access token");
  return data.access_token;
}

async function driveRequest(config: DriveConfig, path: string, init: RequestInit = {}) {
  const token = await accessToken(config);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(`${DRIVE_API}${path}`, { ...init, headers });
}

const escapeQ = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
const rootParent = (config: DriveConfig) => config.rootFolderId || "root";

export async function listFiles(config: DriveConfig, pageToken?: string) {
  const q = ["trashed = false", `'${escapeQ(rootParent(config))}' in parents`].join(" and ");
  const params = new URLSearchParams({
    q,
    pageSize: "100",
    orderBy: "folder,name_natural",
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,parents,webContentLink,thumbnailLink,md5Checksum)",
  });
  if (pageToken) params.set("pageToken", pageToken);
  const response = await driveRequest(config, `/files?${params}`);
  if (!response.ok) throw new Error(`Drive list failed: ${response.status}`);
  return response.json();
}

export async function listFolders(config: DriveConfig, parentId?: string) {
  const parent = parentId || rootParent(config);
  const q = [`'${escapeQ(parent)}' in parents`, `mimeType = '${FOLDER_MIME}'`, "trashed = false"].join(" and ");
  const params = new URLSearchParams({
    q,
    pageSize: "100",
    orderBy: "name_natural",
    fields: "files(id,name,mimeType,createdTime,modifiedTime,parents)",
  });
  const response = await driveRequest(config, `/files?${params}`);
  if (!response.ok) throw new Error(`Drive folder list failed: ${response.status}`);
  return response.json();
}

export async function ensureFolder(config: DriveConfig, name: string, parentId?: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Folder name is required");
  const parent = parentId || rootParent(config);
  const q = [
    `'${escapeQ(parent)}' in parents`,
    `name = '${escapeQ(cleanName)}'`,
    `mimeType = '${FOLDER_MIME}'`,
    "trashed = false",
  ].join(" and ");
  const lookup = new URLSearchParams({ q, pageSize: "10", fields: "files(id,name,mimeType,parents)" });
  const existingResponse = await driveRequest(config, `/files?${lookup}`);
  if (!existingResponse.ok) throw new Error(`Drive folder lookup failed: ${existingResponse.status}`);
  const existing = await existingResponse.json();
  if (existing.files?.length) return existing.files[0];
  return createFolder(config, cleanName, parent);
}

export async function ensureFolderPath(config: DriveConfig, folderPath: string) {
  const names = folderPath.split("/").map(x => x.trim()).filter(Boolean).slice(0, 20);
  let parent = rootParent(config);
  let folder = null;
  for (const name of names) {
    folder = await ensureFolder(config, name, parent);
    parent = folder.id;
  }
  return folder;
}

export async function createFolder(config: DriveConfig, name: string, parentId?: string) {
  const parent = parentId || rootParent(config);
  const response = await driveRequest(config, "/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), mimeType: FOLDER_MIME, parents: [parent] }),
  });
  if (!response.ok) throw new Error(`Drive folder creation failed: ${response.status}`);
  return response.json();
}

export async function uploadFile(config: DriveConfig, file: File, folderId?: string, folderPath?: string) {
  const targetFolder = folderPath ? await ensureFolderPath(config, folderPath) : null;
  const parent = folderId || targetFolder?.id || rootParent(config);
  const metadata = {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    parents: [parent],
  };
  const token = await accessToken(config);
  const initResponse = await fetch(`${DRIVE_UPLOAD}?uploadType=resumable`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": file.type || "application/octet-stream",
      "X-Upload-Content-Length": String(file.size),
    },
    body: JSON.stringify(metadata),
  });
  if (!initResponse.ok) throw new Error(`Drive upload initialization failed: ${initResponse.status}`);
  const location = initResponse.headers.get("Location");
  if (!location) throw new Error("Google Drive did not return an upload URL");

  const uploadResponse = await fetch(location, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream", "Content-Length": String(file.size) },
    body: file.stream(),
  });
  if (!uploadResponse.ok) throw new Error(`Drive upload failed: ${uploadResponse.status}`);
  return uploadResponse.json();
}

export async function getFile(config: DriveConfig, fileId: string) {
  const params = new URLSearchParams({ fields: "id,name,mimeType,size,createdTime,modifiedTime,parents,md5Checksum" });
  const response = await driveRequest(config, `/files/${encodeURIComponent(fileId)}?${params}`);
  if (!response.ok) throw new Error(`Drive metadata failed: ${response.status}`);
  return response.json();
}

export async function moveFile(config: DriveConfig, fileId: string, folderId: string) {
  const current = await getFile(config, fileId);
  const previousParents = (current.parents || []).join(",");
  const params = new URLSearchParams({ addParents: folderId, fields: "id,name,parents" });
  if (previousParents) params.set("removeParents", previousParents);
  const response = await driveRequest(config, `/files/${encodeURIComponent(fileId)}?${params}`, { method: "PATCH" });
  if (!response.ok) throw new Error(`Drive move failed: ${response.status}`);
  return response.json();
}

export async function downloadFile(config: DriveConfig, fileId: string) {
  return driveRequest(config, `/files/${encodeURIComponent(fileId)}?alt=media`);
}

export async function trashFile(config: DriveConfig, fileId: string) {
  const response = await driveRequest(config, `/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trashed: true }),
  });
  if (!response.ok) throw new Error(`Drive trash failed: ${response.status}`);
  return response.json();
}

export async function deleteFile(config: DriveConfig, fileId: string) {
  const response = await driveRequest(config, `/files/${encodeURIComponent(fileId)}`, { method: "DELETE" });
  if (!response.ok) throw new Error(`Drive delete failed: ${response.status}`);
  return { deleted: true };
}
