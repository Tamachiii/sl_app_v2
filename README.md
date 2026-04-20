# Coaching App

A mobile-first PWA connecting coaches and students for strength training programs. Coaches build multi-week programs with exercise slots; students log sets (weight, reps, RPE) and confirm sessions.

## Stack

- **Vite + React + TypeScript**
- **Tailwind CSS v4**
- **React Router**
- **Supabase** (Postgres, Auth, Row Level Security)
- **GitHub Pages** deploy via GitHub Actions

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

### Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`supabase/schema.sql`](./supabase/schema.sql).
3. Copy the project URL and anon key into `.env.local`.
4. To make yourself a coach, in the SQL editor:
   ```sql
   update profiles set role = 'coach', full_name = 'Your Name' where id = auth.uid();
   ```
5. To link a student to you after they sign up:
   ```sql
   update profiles set coach_id = '<your-coach-uuid>' where id = '<student-uuid>';
   ```

## Domain model

```
Program → Weeks → Sessions → Exercise Slots → Set Logs
```

Programs belong to a student; coaches author them. Sessions are confirmed by the student once all sets are logged.

## Roles

- **Coach** — dashboard, per-student program navigation, session editor, review confirmed sessions, exercise library.
- **Student** — today view, session logger (weight/reps/RPE), confirmation, stats, goals.

## Project structure

```
src/
  lib/           Supabase client, auth provider, shared helpers
  routes/        Page components and role-based layouts
  types/         Domain type definitions
supabase/
  schema.sql     Tables, RLS policies, helpers
.github/
  workflows/     GitHub Pages deploy
```

## Deploy to GitHub Pages

1. Push to `main`.
2. Repo → Settings → Pages → **Source: GitHub Actions**.
3. Repo → Settings → Secrets and variables → Actions, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. In Supabase → Authentication → URL Configuration, add your Pages URL to **Site URL** and **Redirect URLs** (required for magic-link email).

The workflow sets `VITE_BASE=/<repo-name>/` automatically so assets resolve correctly on a project page.

## Notes

- GitHub Pages only serves static files; all data and auth go through Supabase.
- Deep links are handled via `public/404.html` + a small redirect script in `index.html` (the [spa-github-pages](https://github.com/rafgraph/spa-github-pages) trick).
- Installable as a PWA on iOS 16.4+ via "Add to Home Screen".
