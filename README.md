# Weekend Summits

Where should I hike this weekend? One page that compares the Saturday and Sunday summit forecast for seven UK hiking destinations, then recommends one for someone based in Brighton. The recommendation weighs three things: the weather while you'd be walking, the drive, and how good the hike is.

| Destination | Area | Height | Difficulty |
| --- | --- | --- | --- |
| Ditchling Beacon | South Downs | 248 m | Easy |
| Seven Sisters | South Downs coast | 80 m | Easy |
| Pen y Fan | Brecon Beacons | 886 m | Moderate |
| Yr Wyddfa (Snowdon) | Snowdonia | 1085 m | Hard |
| Tryfan & the Glyderau | Snowdonia | 918 m | Hard |
| Scafell Pike | Lake District | 978 m | Hard |
| Cairn Gorm & Ben Macdui | Cairngorms | 1245 m | Hard |

Built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui and Auth.js.

## How it works

```
Browser ──> /api/weekend (Next.js server, needs sign-in)
               ├─ Met Office Weather DataHub   (MET_OFFICE_API_KEY, main forecast)
               ├─ Open-Meteo                   (no key: backup, second opinion, sunrise and sunset)
               ├─ OpenRouteService             (ORS_API_KEY, road drive times)
               └─ postcodes.io                 (no key: turns your postcode into coordinates)
```

- **API keys never reach the browser.** Only the server route reads them (`src/lib/env.ts` is marked `server-only`), and the browser only ever calls `/api/weekend`.
- **Each part falls back.** Without a Met Office key it uses Open-Meteo. Without a routing key it estimates drive times. If every weather source fails, it uses generated demo data with a clear label.
- **Caching keeps you inside the free plans.** Forecasts are cached for an hour and drive times for a day. The route needs sign-in, so strangers can't use up your allowance.
- **Scoring runs in the browser** (`src/lib/scoring.ts`), so changing the weights in Settings updates the ranking instantly. It only looks at 09:00 to 16:00, counts wind for more on exposed ridges, trusts forecasts four or more days out less, and never recommends a day with dangerous gusts, thunder, heavy snow or severe wind chill.

## Run it locally

You need Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local   # optional: the app runs without any keys
npm run dev                  # http://localhost:4317
```

With no keys at all, you get live Open-Meteo forecasts, estimated drive times, and **sign-in switched off** (local development only, with a banner saying so).

Other commands: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Getting the API keys

All of these are free. Put the values in `.env.local`, which git ignores, and never in the code.

1. **Met Office Weather DataHub.** Sign up at <https://datahub.metoffice.gov.uk>, subscribe to the free **Site Specific** plan, and copy the API key into `MET_OFFICE_API_KEY`. The app makes at most 7 calls an hour, well inside the free daily limit.
2. **OpenRouteService.** Sign up at <https://openrouteservice.org/dev/#/signup>, create a token, and put it in `ORS_API_KEY`.
3. **GitHub sign-in.**
   - Go to <https://github.com/settings/developers> and choose **New OAuth App**.
   - Set the homepage to `http://localhost:4317` and the callback URL to `http://localhost:4317/api/auth/callback/github`.
   - Copy the Client ID into `AUTH_GITHUB_ID`, then generate a secret and put it in `AUTH_GITHUB_SECRET`.
   - Run `npx auth secret` (or `openssl rand -base64 32`) and put the result in `AUTH_SECRET`.
   - Put your GitHub username in `ALLOWED_GITHUB_USERS`. Nobody else will be able to sign in.

Restart `npm run dev` after changing `.env.local`.

## Put it live (Vercel, from GitHub)

GitHub Pages can only serve static files, so it can't keep API keys secret. Instead, the code lives on GitHub and Vercel runs it for free:

1. Push this repository to GitHub.
2. At <https://vercel.com/new>, import the repository. Vercel detects Next.js automatically.
3. Under **Settings > Environment Variables**, add every variable from `.env.example` that you use.
4. In your GitHub OAuth app, add the production callback URL: `https://<your-app>.vercel.app/api/auth/callback/github`. A separate OAuth app for production is cleaner.
5. Redeploy. From now on, every push to `main` goes live, and every pull request gets its own preview URL.

A production deployment **without** the `AUTH_*` variables won't serve any forecasts. It shows a "sign-in isn't configured" message rather than opening the app to everyone.

## Keeping the secrets secret

- `.env.local` is git-ignored. Only `.env.example`, which has no values, is committed.
- Turn on **Settings > Code security > Secret scanning and push protection** in GitHub. GitHub will then block any push that contains a key.
- **If a key leaks:** create a new one with the provider, update it in `.env.local` and in Vercel, redeploy, then revoke the old key.

## Project layout

```
src/
  app/
    page.tsx                  dashboard (needs sign-in)
    signin/page.tsx           GitHub sign-in
    api/weekend/route.ts      combines forecasts and drive times (needs sign-in)
    api/auth/[...nextauth]/   Auth.js handlers
  auth.ts                     Auth.js setup and allowlist
  data/mountains.ts           the destinations: add more here
  lib/
    env.ts                    server-only reading and checking of keys
    weekend.ts                works out the weekend and applies the fallbacks
    scoring.ts                weather, travel and quality scores, safety vetoes, recommendation
    providers/                Met Office, Open-Meteo, OpenRouteService, postcodes.io, demo data
  components/                 dashboard, cards, detail panel, chart, settings
```

## Adding a destination

Add an entry to `src/data/mountains.ts` with the summit coordinates and height, trailhead coordinates, difficulty, exposure (`low`, `medium`, `high` or `extreme`), a 1 to 5 quality rating, and a typical drive time from Brighton. Everything else picks it up automatically.

## Disclaimer

The scores are a planning aid, not a safety call. On the day, check the [Met Office mountain forecast](https://www.metoffice.gov.uk/weather/specialist-forecasts/mountain) or [MWIS](https://www.mwis.org.uk/forecasts), and make your own judgement on the hill.
