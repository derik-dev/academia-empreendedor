# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Dev server (binds to 0.0.0.0)
npm run lint       # ESLint
npm run build      # TypeScript check + Vite production bundle
npm run preview    # Serve the dist/ bundle locally
```

No automated test runner is configured. Run `npm run lint` and `npm run build` before submitting changes, then verify routes manually.

## Environment

Copy `.env.example` to `.env` and set:
- `VITE_SUPABASE_URL` — project URL (root, not a service endpoint)
- `VITE_SUPABASE_ANON_KEY` — anon/publishable key only

Never put secrets, `service_role` keys, or `OPENAI_API_KEY` in `VITE_*` variables. The OpenAI key belongs only in `supabase/functions/.env` (local) or the Edge Function secrets (remote).

## Architecture

**Stack:** React 18 + TypeScript + Vite SPA, Supabase for auth/DB/storage, React Router v6, Lucide icons.

**Deployment path:** The entire app is served under `/academia/`. Vite's `base`, React Router's `basename`, and the Apache `.htaccess` fallback all use this prefix. The landing page at `/` is separate and must not be overwritten.

**Single-file app:** Almost all page-level components live in `src/App.tsx`. Route definitions are at the bottom of that file. Shell/sidebar/profile utilities are in `src/components/Chrome.tsx`.

**Content model — two layers merged at runtime:**
1. Static seed data in `src/data/content.ts` (`areas` array) — defines the fixed placeholder courses/podcasts with their slugs, categories, and static images.
2. Published courses fetched from Supabase via `usePublishedCourses` — rows from the `courses` + `lessons` tables. These override the static entries where slugs match (`useLibraryCourses` in App.tsx merges them).

Dynamic data hooks: `useInterviews`, `useArticles`, `useArticle`, `useZoomRecordings` — all live in `src/data/` and fetch directly from Supabase.

**Auth — two independent sessions:**
- `src/lib/supabase.ts` exports two Supabase clients: `supabase` (student session, default storage key) and `adminSupabase` (admin session, storage key `academia-admin-auth`). This keeps admin login/logout from affecting student sessions.
- Student auth: `AuthProvider` / `useAuth` wraps `supabase`.
- Admin auth: `AdminAuthProvider` / `useAdminAuth` wraps `adminSupabase` and verifies presence in the `public.admin_users` table via `is_academy_admin()`.
- Admin routes are wrapped in `<AdminAuthProvider>` in App.tsx; non-admin routes share one outer `<AuthProvider>` (in `src/main.tsx`).

**AI proxy:** `supabase/functions/openai-proxy/` is a Deno Edge Function. It validates the admin session server-side before proxying requests to OpenAI. Local config in `supabase/config.toml`; must be deployed separately to take effect remotely.

**Database migrations:** Versioned SQL files are in `supabase/migrations/`. The remote schema has diverged from the local files. **Do not apply the migrations folder wholesale.** Read `docs/SUPABASE_MIGRATION_RECONCILIATION.md` before any schema change. Never apply migrations to production without a backup and schema diff.

## Design rules

The platform uses a dark theme throughout — follow `DESIGN_RULES.md` when touching UI:

- Backgrounds: `#05080D` (base), `#080D14` (surfaces), `#0B111B` (cards).
- Text: white (`#FFFFFF`) or strong blue (`#24A8FF`) only — no low-opacity grays.
- Accents (blue, green, violet, amber) are for interactive states, not dominant fills.

Typography tokens are defined in `src/styles.css` `:root` and must be used for new components:

| Role | Token |
|---|---|
| Card/section titles | `--type-content-title` (26 px) |
| Body text & descriptions | `--type-content-body` (17 px) |
| Author, profile values, CTAs | `--type-content-detail` (19 px) |
| Labels, metadata | `--type-ui-small` (14 px) |
| Main nav | `--type-nav` (15 px / 12 px ≤ 1180 px) |

Do not add isolated font sizes to new components — pick an existing token from this scale.

## Image helpers

`src/lib/publicUrl.ts` exports `img(path)` — use this for all `public/` image paths so the `/plataforma/` base prefix is applied correctly. `src/lib/cardCover.ts` exports `cardCover(url)` for course/podcast cover images with a fallback.
