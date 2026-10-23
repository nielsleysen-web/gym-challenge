# November Gym Challenge

Team accountability site. Static front-end (`public/index.html`) + 4 Vercel serverless functions (`api/`). Photos and all state live in Vercel Blob — no database needed.

## How scoring works (api/_lib.js)
- Challenge window: 1–30 Nov 2026 (`CHALLENGE.start/end`).
- One photo per person per day, first upload counts, nothing can be deleted or replaced.
- A team scores 1 point for a day only if **both** members uploaded that day (before 23:59 their own local time).
- Every 7 consecutive scored days = +3 bonus (day 7, 14, 21, 28).
- Tie-break: longest streak.
- Days before 1 Nov are accepted (for testing) but never scored.

## Deploy (first time, ~5 minutes)
1. `cd gym-challenge && npx vercel` → follow the prompts (log in, accept defaults).
2. In the Vercel dashboard → project → **Storage → Create → Blob** → connect it to the project (this sets `BLOB_READ_WRITE_TOKEN`).
3. Project → **Settings → Environment Variables** → add:
   - `PINS` = `shawn=1234,genesis=2345,donna=3456,aaron=4567,niels=9999` (pick your own 4–6 digit PINs)
   - `SESSION_SECRET` = any long random string
4. `npx vercel --prod` to redeploy with the env vars.

## Changing names, teams, dates, prize
Edit `api/_lib.js` (`CHALLENGE`, `TEAMS`, `USERS`) and the `USERS_LOGIN` list at the top of `public/index.html`, then `npx vercel --prod`.

## Local dev
`PINS="shawn=1111,niels=9999" node dev/server.js` → http://localhost:3000 (uses a fake blob store on disk).
