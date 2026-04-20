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
- Workflow secrets required: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Workflow writes them to `.env.production` before build so Vite inlines them (setting them as plain shell env vars doesn't work — Vite reads `.env*` files).
- **Local `.env` must use LF line endings**, not CRLF — otherwise `source`/`gh secret set` picks up values with a trailing `\r`.
- Auth is **email + password** (not magic link). Sign-up writes `full_name` into `raw_user_meta_data`; the `handle_new_user` trigger reads it into `profiles`.

## Commands

```bash
npm run dev      # local dev server
npm run build    # typecheck + production build
npm run preview  # preview the built bundle
```

## Progress

### Shipped
- Vite + React + TS + Tailwind v4 scaffold; role-aware router in `App.tsx`.
- Supabase schema with RLS policies for both roles (`supabase/schema.sql`).
- Email + password auth (`src/routes/SignIn.tsx`) with sign-up that captures `full_name`.
- GitHub Pages deploy workflow with `.env.production` generation; SPA 404 redirect.
- **Student side**
  - Home with next-session card and pending/completed counts (`features/student/StudentHome.tsx`).
  - Sessions list grouped by week with confirmed/pending badges (`StudentSessions.tsx`).
  - Session logger: per-slot set rows with weight/reps/RPE inputs, last-session hints, add/remove sets, confirm session (`StudentSessionLog.tsx`, `useSessionDetail.ts`).
- **Coach side**
  - Dashboard with student/session stats (`features/coach/CoachDashboard.tsx`).
  - Students list with pending counts (`CoachStudents.tsx`).
  - Student view: goals CRUD, programs tree (weeks → sessions), create program/week/session, duplicate week (`CoachStudentView.tsx`).
  - Session editor: rename, add/remove exercise slots, coach notes per slot, delete session (`CoachSessionEditor.tsx`).
  - Exercise library: search, type filter, add/delete (`CoachExercises.tsx`).
  - Reviews: recent confirmed sessions across students (`CoachReviews.tsx`).

### Upcoming
1. **Student Stats** — volume/1RM trends per exercise, sessions/week, PR tracker.
2. **Student Goals** — read-only view of goals set by the coach (currently a placeholder).
3. **Session prescription structure** — today slots only have free-text `coach_notes`. Consider adding `target_sets`, `target_reps`, `target_weight` on `exercise_slots` for a structured "3×5 @ 80kg" layout in both editor and logger.
4. **Coach review depth** — click into a confirmed session to see the student's set logs side-by-side with the prescription; add a `coach_feedback` text field.
5. **Offline-first logging** — students log at the gym with flaky signal. Queue `set_logs` writes locally (IndexedDB) and sync on reconnect.
6. **Coach self-assignment of students** — today linking coach↔student requires an SQL update. Add an invite code or a "claim student" flow.
7. **Form-check video upload** — Supabase Storage bucket, student uploads a clip on a slot, coach leaves a threaded comment.
8. **PWA manifest + icons** — for real "Add to Home Screen" on iOS.
9. **Push notifications** (iOS 16.4+) — session assigned, feedback posted.

## Things to avoid

- Don't add a state management library (Redux/Zustand) yet — React state + Supabase queries are enough at this scale.
- Don't introduce a UI component library. Tailwind + small local components only.
- Don't commit `.env` (gitignored). Only `.env.example` is tracked.
- Don't add backwards-compat shims — we have no users yet; change the code directly.
