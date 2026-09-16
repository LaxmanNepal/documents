# Google Drive gateway

This Edge Function is the server-side storage boundary for Laxman Vault.

## Production secrets

Set these in **Supabase Edge Function Secrets**, never in GitHub source:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REFRESH_TOKEN`
- `GOOGLE_DRIVE_ROOT_FOLDER_ID` (optional)

The refresh token must come from a Google OAuth web-server flow using offline access. Keep it server-side.

## Deploy

```bash
supabase functions deploy drive-gateway --use-api
```

The function expects an authenticated Supabase user JWT. It intentionally does not expose Google credentials to the browser.

## Next storage milestone

After OAuth secrets are configured, implement the Drive operations behind this endpoint:

1. list vault files
2. create/find the vault root folder
3. resumable upload
4. secure download/stream
5. trash/restore/delete
6. metadata synchronization with `public.documents`

Do not put Google refresh tokens, client secrets, or the vault master key in `index.html`, `app.js`, or any public repository file.
