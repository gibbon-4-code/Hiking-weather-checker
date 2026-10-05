# Summit Planner

Where should I hike, and when? Tell it where you're starting from (a postcode or a town), how long you'll drive and which day (up to two weeks ahead), and it ranks around 200 hikes across England, Wales and Scotland. The recommendation weighs three things: the weather while you'd be walking, the drive, and how good the hike is.

The destinations run from easy South Downs and Peak District walks to the big days in the Lake District, Snowdonia, Glen Coe, Skye and Torridon. They live in `src/data/mountains/`, one file per country.

Built with Next.js 16, TypeScript, Tailwind CSS, shadcn/ui and Auth.js.

## How it works

```
Browser ──> /api/plan (Next.js server, needs sign-in)
               ├─ Open-Meteo                   (no key: forecast for every destination, sunrise and sunset)
               ├─ OpenRouteService             (ORS_API_KEY, road drive times)
               └─ postcodes.io                 (no key: turns your postcode or town into coordinates)
        ──> /api/second-opinion (needs sign-in, when you open a destination's details)
               └─ Met Office Weather DataHub   (MET_OFFICE_API_KEY, optional)
```

- **API keys never reach the browser.** Only the server reads them (`src/lib/env.ts` is marked `server-only`).
- **One request covers every destination.** Open-Meteo forecasts all of them in a single batched call, and OpenRouteService returns every drive time in one matrix call. The Met Office charges one call per mountain, so it's only asked about the mountain you open.
- **Each part falls back.** Without a routing key it estimates drive times from straight-line distance. If the weather source fails, it uses generated demo data with a clear label.
- **Caching keeps you inside the free plans.** Forecasts are cached for an hour and drive times for a day. The routes need sign-in, so strangers can't use up your allowance.
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

1. **Met Office Weather DataHub.** Sign up at <https://datahub.metoffice.gov.uk>, subscribe to the free **Site Specific** plan, and copy the API key into `MET_OFFICE_API_KEY`. It is optional: the app only calls it when you open a destination, once per mountain per hour.
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
    api/plan/route.ts         combines forecasts and drive times (needs sign-in)
    api/second-opinion/       Met Office view of one destination (needs sign-in)
    api/auth/[...nextauth]/   Auth.js handlers
  auth.ts                     Auth.js setup and allowlist
  data/mountains/             the destinations, one file per country
scripts/
  check-mountains.mts         checks the destinations against OpenStreetMap
  lib/
    env.ts                    server-only reading and checking of keys
    plan.ts                   builds the plan for a day and applies the fallbacks
    scoring.ts                weather, travel and quality scores, safety vetoes, recommendation
    providers/                Met Office, Open-Meteo, OpenRouteService, postcodes.io, demo data
  components/                 dashboard, cards, detail panel, chart, settings
```

## Adding a destination

1. Add an entry to the right file in `src/data/mountains/`. Each entry needs the summit position and height, the trailhead car park's position, the difficulty, the exposure (`low`, `medium`, `high` or `extreme`), a 1 to 5 quality rating, the route, the walking time and a town to stay in.
2. Check it against OpenStreetMap:
   ```bash
   npm run check:mountains -- src/data/mountains/wales.ts
   ```
   This looks for a named peak near each summit and a car park near each trailhead, and lists anything that doesn't line up, with nearby alternatives. Add `--fix` to copy OpenStreetMap's summit position and height into the file wherever the name matches. The public Overpass server is shared and sometimes overloaded; if it keeps timing out, point the script at a mirror, for example `OVERPASS_URL=https://maps.mail.ru/osm/tools/overpass/api/interpreter`.
3. Run `npm test`. A data test checks every entry is complete, inside Great Britain and has its trailhead within 12 km of its summit.

Everything else in the app picks the new entry up automatically.

## Credits

Summit positions and heights, and trailhead car parks, were checked against [OpenStreetMap](https://www.openstreetmap.org/copyright) data, © OpenStreetMap contributors, available under the Open Database Licence. Weather from [Open-Meteo](https://open-meteo.com/) (CC BY 4.0) and, optionally, the Met Office.

## Disclaimer

The scores are a planning aid, not a safety call. On the day, check the [Met Office mountain forecast](https://www.metoffice.gov.uk/weather/specialist-forecasts/mountain) or [MWIS](https://www.mwis.org.uk/forecasts), and make your own judgement on the hill.
