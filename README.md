# Laxman Personal Document Vault

A private, single-user document vault. GitHub stores only the application source code; personal documents must live in a private storage backend.

## Architecture

- **Frontend:** static HTML/CSS/JavaScript
- **Authentication:** Supabase Auth (email/password)
- **Database:** Supabase Postgres for document metadata
- **Storage:** Supabase Storage with a **private** bucket
- **Authorization:** Row Level Security (RLS) + storage policies
- **Downloads/previews:** short-lived signed URLs

## Security rules

1. Never commit personal documents to this repository.
2. Never put a Supabase service-role key in the frontend or GitHub.
3. Keep the storage bucket private.
4. Disable public sign-up after creating the owner account.
5. Use RLS policies from `supabase/schema.sql`.
6. Use a strong password and enable MFA in Supabase Auth when available.

## Setup

1. Create a Supabase project.
2. Create the owner account in Supabase Auth.
3. Disable public sign-up in Auth settings.
4. Run `supabase/schema.sql` in the Supabase SQL editor.
5. Create a private storage bucket named `documents` (the SQL file also documents the required policies).
6. Copy `config.example.js` to `config.js` and add the Supabase project URL and **anon/publishable** key.
7. Deploy the repository as a static site.

The anon/publishable key is intended for browser use; the service-role key is not.

## Included features

- Single-user login UI
- Responsive liquid-glass dashboard
- Search and category filtering
- Upload with metadata
- Recent documents
- Favorites
- PDF/image preview
- Download through signed URLs
- Delete/trash workflow
- Storage statistics
- Session-aware logout
- Mobile responsive layout

## Roadmap

- MFA UI
- Client-side encrypted vault mode
- Folder management
- Bulk upload
- Restore from trash
- Audit/activity log
- Duplicate detection
- PWA/offline shell
