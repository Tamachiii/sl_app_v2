# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

Mobile-first PWA connecting **coaches** and **students** for strength training. Coaches author multi-week programs; students log sets (weight, reps, RPE) and confirm sessions. Hosted on GitHub Pages (static) + Supabase (data, auth, RLS).

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`, imported with `@import "tailwindcss"` — **no `tailwind.config.js`**)
- React Router v7 (`BrowserRouter`, `basename` from `import.meta.env.BASE_URL`)
- Supabase JS (`@supabase/supabase-js`) — auth via magic link OTP
- Deploys via `.github/workflows/deploy.yml`

## Domain model

```
Program → Weeks → Sessions → Exercise Slots → Set Logs
```

- `profiles.role` is `'coach' | 'student'`; students are linked to a coach via `profiles.coach_id`.
- Sessions have `confirmed_at` — set by the student when a session is done.
- Exercise library (`exercises`) is shared; coaches author, everyone reads.
- Goals belong to a student; coaches write, students read.

Full schema and RLS policies: `supabase/schema.sql`. **Never bypass RLS** — client uses the anon key only.

## Layout

```
src/
  App.tsx              Router, role gating, route table
  lib/
    supabase.ts        Client singleton (reads VITE_SUPABASE_* env)
    session.ts         AuthContext + useAuth hook
    AuthProvider.tsx   Loads session + profile, subscribes to auth changes
  routes/
    SignIn.tsx         Magic-link form
    CoachLayout.tsx    Top tab shell
    StudentLayout.tsx  Bottom tab shell (mobile-first)
    pages.tsx          Page stubs — replace as features land
  types/domain.ts      Shared domain types
supabase/schema.sql    Tables, RLS, helper functions
```

## Conventions

- **Role gating happens in `App.tsx`** via `<RoleRoute role="coach|student">`. Don't duplicate role checks inside pages — trust the gate.
- **Mobile-first.** Student UI is designed for one-handed phone use (bottom nav, large tap targets). Coach UI is OK on desktop but should still work on tablet.
- **Queries live with the feature that uses them**, not in a central `api/` folder. Use `supabase.from(...)` directly in components or small hooks. Don't build a generic repository layer.
- **Types mirror DB columns** in `src/types/domain.ts`. When the schema changes, update both.
- **RLS is the security layer** — always assume the client is adversarial. Don't add client-side auth checks that RLS already enforces.
- **No comments that restate the code.** Only comment the *why* when non-obvious (e.g. the SPA 404 redirect trick in `index.html`).

## GitHub Pages specifics

- `vite.config.ts` reads `VITE_BASE` at build time. The workflow sets it to `/<repo-name>/`.
- Deep links: `public/404.html` redirects → `index.html` restores the path (spa-github-pages trick). Don't remove either half.
- Workflow secrets required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Pages URL must be added to Supabase → Auth → URL Configuration for magic links to work.

## Commands

```bash
npm run dev      # local dev server
npm run build    # typecheck + production build
npm run preview  # preview the built bundle
```

## What to build next (priority)

1. **Student set logger** — list assigned sessions, log sets per slot, show last-session weights, confirm session. Highest-value surface.
2. **Coach student view** — per-student program navigator (weeks → sessions).
3. **Coach session editor** — add/edit slots, reps, weights, notes, duplicate week.
4. **Exercise library** — searchable list, client-side filter by `type`.
5. **Review sessions** (coach) — recent confirmed sessions across students.
6. **Stats** (student), **Goals**, **Dashboard** (coach overview).

## Things to avoid

- Don't add a state management library (Redux/Zustand) yet — React state + Supabase queries are enough at this scale.
- Don't introduce a UI component library. Tailwind + small local components only.
- Don't commit `.env` (gitignored). Only `.env.example` is tracked.
- Don't add backwards-compat shims — we have no users yet; change the code directly.
