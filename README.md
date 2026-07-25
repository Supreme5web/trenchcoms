# TrenchComs

Production Vite + React app for token-community social spaces powered by Supabase.

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Copy `.env.example` to `.env` and fill in:

   ```bash
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   ```

3. Run `schema.sql` in the Supabase SQL editor, then `profile-trigger.sql`, then `notifications-trigger.sql`, then `storage-setup.sql` (creates the public `media` storage bucket used for community banners/logos and post photos). If you already have a project running an older schema, also run everything under `migrations/` in filename order.

4. Start locally:

   ```bash
   npm run dev
   ```

## Production deploy

Use Vercel with the included `vercel.json` SPA rewrite. Set these environment variables in Vercel before deploying:

```bash
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

In Supabase Auth > URL Configuration, add your production domain and local dev URL:

```text
Site URL: https://your-domain.com
Redirect URLs:
http://localhost:5173/**
https://your-domain.com/**
```

Before every deploy, run:

```bash
npm run build
```
