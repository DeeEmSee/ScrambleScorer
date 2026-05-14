# ScrambleScorer

## Purpose
A mobile-first web app for tracking golf scramble tournament scores in real time. Groups play simultaneously and can see all teams' scores live, communicate via match chat, and share images. Designed to be used on mobile browsers on the golf course.

## Tech Stack
- **React 19** + **Vite 8** (HashRouter for routing)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **Supabase** — Postgres database + real-time subscriptions + storage (chat images)
- **Golf Course API** (`api.golfcourseapi.com`) — optional course search to auto-fill hole pars

## Project Structure
```
src/
  App.jsx              # Route definitions (HashRouter)
  index.css            # Global styles, Tailwind import, theme vars, .mg-gradient
  pages/
    Home.jsx           # Landing — join existing match or create new
    Setup.jsx          # 3-step wizard: match details → hole pars → teams
    ScramblePage.jsx   # Post-creation confirmation, shows team PINs
    Leaderboard.jsx    # Live standings + match chat (main page users land on)
    ScoreEntry.jsx     # Team selects themselves, enters score per hole
    AllScores.jsx      # Full scorecards for all teams in a table view
  components/
    Layout.jsx         # Shared header (logo + tournament name + tab nav) + main wrapper
  lib/
    supabase.js        # Supabase client
```

## Routing
```
/                          → Home
/setup                     → Setup wizard
/scramble/:id              → ScramblePage (redirects to leaderboard if no state)
/scramble/:id/leaderboard  → Leaderboard
/scramble/:id/score        → ScoreEntry
/scramble/:id/scores       → AllScores
```

## Database Schema (Supabase)
- **scrambles**: `id, code, name, num_holes, date, created_at`
- **holes**: `id, scramble_id, hole_number, par`
- **teams**: `id, scramble_id, name, pin (nullable)`
- **scores**: `id, team_id, hole_number, strokes, created_at`
- **messages**: `id, scramble_id, team_id, team_name, text, type ('score'|'image'|text), created_at`
- **Storage bucket**: `chat-images` (public, max 5MB per image)

Real-time via Supabase channels: `scores-{id}` for standings, `messages-{id}` for chat.

Team identity is stored in `localStorage` as `scramble_team_{id}` (JSON with `id` and `name`).

## Design System
Masters Golf theme. Custom CSS vars defined in `index.css`:
- `--color-masters-green: #006747` (primary)
- `--color-masters-darkgreen: #004d35` (hover states)
- `--color-masters-gold: #CFA84C` (accents, active tabs)
- `--color-masters-cream: #FAF7F0` (hover backgrounds)
- `--color-under-par: #CC0000` (under par scores)
- `.mg-gradient` — linear gradient `#005a3c → #006747 → #007a52` (used on all green headers)

Score display: under par = red, over par = blue, even = gray/`E`.

Font: Georgia serif for headings/labels, system-ui for body.

## Layout Component
Used by Leaderboard, ScoreEntry, AllScores. Renders:
- Green gradient header with ⛳ logo (links to `/`) and optional truncated tournament name on the right
- Tab nav row (Leaderboard / Enter Score / All Scores) when `id` param is present
- `<main className="flex-1">` wrapping `{children}`

Pages that do NOT use Layout (have their own headers): Home, Setup, ScramblePage.

## Key Gotcha: Tailwind v4 HMR
**New Tailwind utility classes added to a file do not always get generated on hot reload.** If a spacing/sizing class wasn't already in the codebase, it may have no effect in the dev server. Use **inline `style={{ }}`** for any new spacing values to guarantee they apply. Classes already present in the codebase work fine.

## Mobile-First Notes
- Target: mobile browsers, portrait orientation
- Page containers use `max-w-md` or `max-w-lg mx-auto` to center on desktop
- Cards use `mx-4` horizontal margin from screen edges
- The scorecard table in AllScores is wide (22 cols for 18-hole) — wrapped in `overflow-x-auto`
- Header tournament name uses `style={{ marginLeft: '1rem', marginRight: '0.35rem' }}` (inline, not Tailwind) to keep it off screen edges
- `overflow-x: hidden` on body prevents horizontal page scroll from wide table content
