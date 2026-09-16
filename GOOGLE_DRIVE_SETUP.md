# Google Drive storage setup

The vault now supports Google Drive as the real file backend. Browser code never receives the Google OAuth client secret or refresh token. The browser sends the authenticated Supabase user JWT to the `drive-gateway` Edge Function, which talks to Google Drive server-side.

## 1. Run the database migration

Run:

```text
supabase/migrations/004_google_drive_storage.sql
```

It adds `storage_provider` and `drive_file_id` while keeping existing Supabase Storage files compatible.

## 2. Configure the Google OAuth application

Enable the Google Drive API in your Google Cloud project and create OAuth credentials for the Google account that owns the vault.

Keep the Google OAuth client secret and refresh token private. They belong only in Supabase Edge Function secrets.

## 3. Set Supabase Edge Function secrets

Set these secrets in the Supabase project:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` (optional)

Supabase exposes Edge Function secrets as environment variables; do not put these values in `config.js`, GitHub, or browser JavaScript.

## 4. Deploy the gateway

Deploy:

```text
supabase/functions/drive-gateway
```

The frontend automatically uses:

```text
https://YOUR_PROJECT.supabase.co/functions/v1/drive-gateway
```

unless `driveGatewayUrl` is explicitly set in `config.js`.

## 5. Configure the browser

Copy `config.example.js` to `config.js` and set your Supabase URL and publishable/anon key. Keep:

```js
storageProvider: 'google-drive'
```

No Google secret belongs in this file.

## What is now wired

- Multi-file browser upload → Google Drive
- Drive file ID stored with document metadata
- Secure authenticated Drive download
- PDF/image preview through an authenticated Drive download
- Drive trash
- Permanent Drive delete
- Drive file listing API
- Existing Supabase Storage documents continue to work
- Supabase metadata remains the vault index for folders, categories, notes, favorites and trash

The current upload path sends the file through the authenticated Edge Function. For very large files, a later resumable-session upgrade can move the data path to a direct short-lived Google upload session while keeping credentials server-side.
