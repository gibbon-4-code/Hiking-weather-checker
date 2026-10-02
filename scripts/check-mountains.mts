/**
 * Checks the mountain list against OpenStreetMap: each summit should sit on a named peak, and each
 * trailhead next to a car park. Positions and heights © OpenStreetMap contributors (ODbL).
 *
 *   npm run check:mountains -- src/data/mountains/wales.ts          report only
 *   npm run check:mountains -- src/data/mountains/wales.ts --fix    also copy matched summit positions and heights in
 *
 * Runs on Node's built-in TypeScript support, so it only uses plain Node APIs.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

interface Point {
  lat: number;
  lon: number;
}
interface MountainLike {
  id: string;
  name: string;
  summit: Point & { elevationM: number };
  trailhead: Point & { name: string };
}
interface OsmElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: Point;
  tags?: Record<string, string>;
}

const OVERPASS = "https://overpass-api.de/api/interpreter";
const PEAK_RADIUS_M = 3000;
const PARKING_RADIUS_M = 600;
/** How far to look for alternatives when a trailhead has no car park beside it. */
const PARKING_SEARCH_M = 2000;
/** A peak this close is the same summit, whatever OpenStreetMap calls it. */
const SAME_PLACE_M = 150;
/** Beyond these, a match is worth a human look even if the name agrees. */
const SUMMIT_WARN_M = 250;
const ELEVATION_WARN_M = 15;

const [file, ...flags] = process.argv.slice(2);
if (!file) {
  console.error("Usage: npm run check:mountains -- <region file> [--fix]");
  process.exit(1);
}
const fix = flags.includes("--fix");
const path = resolve(file);
const regionFile = (await import(pathToFileURL(path).href)) as Record<string, MountainLike[]>;
const mountains = Object.values(regionFile).find(Array.isArray);
if (!mountains) throw new Error(`No mountain list exported from ${file}`);

const elements = await overpass(mountains);
const peaks = elements.filter((e) => e.tags?.natural === "peak");
const parkings = elements.filter((e) => e.tags?.amenity === "parking");

let source = readFileSync(path, "utf8");
let problems = 0;
let fixed = 0;

for (const m of mountains) {
  const lines: string[] = [];

  const nearby = peaks
    .map((p) => ({ p, d: metres(m.summit, position(p)) }))
    .filter((x) => x.d <= PEAK_RADIUS_M)
    .sort((a, b) => a.d - b.d);
  // A peak whose name matches, or failing that one practically on top of ours ("Beacon Hill" is Ivinghoe Beacon).
  const match = nearby.find((x) => namesMatch(m, x.p)) ?? nearby.find((x) => x.d <= SAME_PLACE_M);

  if (!match) {
    problems++;
    const options = nearby.slice(0, 4).map((x) => `${label(x.p)} ${ele(x.p) ?? "?"} m @ ${Math.round(x.d)} m ${where(x.p)}`);
    lines.push(`  ✗ summit: no peak named like "${m.name}" within ${PEAK_RADIUS_M / 1000} km. Nearest: ${options.join("; ") || "none"}`);
  } else {
    const at = position(match.p);
    const height = ele(match.p);
    const off = Math.round(match.d);
    const dEle = height === null ? null : Math.round(height - m.summit.elevationM);
    const odd = off > SUMMIT_WARN_M || (dEle !== null && Math.abs(dEle) > ELEVATION_WARN_M);
    if (odd) problems++;
    lines.push(
      `  ${odd ? "!" : "✓"} summit: ${label(match.p)} ${height ?? "?"} m, ${off} m from ours` +
        (dEle ? `, height ${dEle > 0 ? "+" : ""}${dEle} m` : ""),
    );
    if (fix && (off > 20 || dEle)) {
      const next = replaceSummit(source, m.id, at, height ?? m.summit.elevationM);
      if (next !== source) {
        source = next;
        fixed++;
      }
    }
  }

  const parks = parkings
    .map((p) => ({ p, d: metres(m.trailhead, position(p)) }))
    .filter((x) => x.d <= PARKING_SEARCH_M)
    .sort((a, b) => a.d - b.d);
  const park = parks[0] && parks[0].d <= PARKING_RADIUS_M ? parks[0] : undefined;
  if (!park) {
    problems++;
    const options = parks.slice(0, 4).map((x) => `${label(x.p)} @ ${Math.round(x.d)} m ${where(x.p)}`);
    lines.push(
      `  ✗ trailhead: no car park within ${PARKING_RADIUS_M} m of "${m.trailhead.name}". Nearest: ${options.join("; ") || "none"}`,
    );
  } else {
    lines.push(`  ✓ trailhead: car park${park.p.tags?.name ? ` "${park.p.tags.name}"` : ""} ${Math.round(park.d)} m away`);
  }

  const summitToTrailhead = metres(m.summit, m.trailhead) / 1000;
  if (summitToTrailhead > 12) {
    problems++;
    lines.push(`  ✗ trailhead is ${summitToTrailhead.toFixed(1)} km from the summit`);
  }

  const flagged = lines.some((l) => !l.startsWith("  ✓"));
  console.log(`${flagged ? "⚠" : "✓"} ${m.id}`);
  if (flagged) console.log(lines.join("\n"));
}

if (fix && fixed) writeFileSync(path, source);
console.log(`\n${mountains.length} checked, ${problems} to look at${fix ? `, ${fixed} summits updated` : ""}.`);

/** Small batches with retries: Overpass is a shared volunteer service and times out on big queries. */
async function overpass(list: MountainLike[]): Promise<OsmElement[]> {
  const all: OsmElement[] = [];
  for (let i = 0; i < list.length; i += 8) {
    all.push(...(await overpassBatch(list.slice(i, i + 8))));
    console.error(`  fetched ${Math.min(i + 8, list.length)}/${list.length} from OpenStreetMap`);
  }
  return all;
}

async function overpassBatch(list: MountainLike[], attempt = 1): Promise<OsmElement[]> {
  const parts = list.flatMap((m) => [
    `node(around:${PEAK_RADIUS_M},${m.summit.lat},${m.summit.lon})["natural"="peak"];`,
    `nwr(around:${PARKING_SEARCH_M},${m.trailhead.lat},${m.trailhead.lon})["amenity"="parking"];`,
  ]);
  const query = `[out:json][timeout:90];(${parts.join("")});out center tags;`;
  const res = await fetch(OVERPASS, {
    method: "POST",
    headers: { "User-Agent": "hiking-weather-checker data check", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ data: query }),
  });
  if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements;
  if (attempt < 4 && (res.status === 429 || res.status >= 500)) {
    await new Promise((r) => setTimeout(r, attempt * 15000));
    return overpassBatch(list, attempt + 1);
  }
  throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

function position(e: OsmElement): Point {
  return e.center ?? { lat: e.lat!, lon: e.lon! };
}

function ele(e: OsmElement) {
  const n = Number.parseFloat(e.tags?.ele ?? "");
  return Number.isFinite(n) ? Math.round(n) : null;
}

function where(e: OsmElement) {
  const at = position(e);
  return `[${at.lat.toFixed(4)}, ${at.lon.toFixed(4)}]`;
}

function label(e: OsmElement) {
  return e.tags?.name ?? "(unnamed)";
}

function normalise(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** "Tryfan & the Glyderau" matches a peak called "Tryfan"; "Yr Wyddfa (Snowdon)" matches "Yr Wyddfa / Snowdon". */
function namesMatch(m: MountainLike, peak: OsmElement) {
  const ours = [m.name, ...m.name.split(/ & | \(|\)|\//), m.id.replace(/-/g, " ")]
    .map(normalise)
    .filter((s) => s.length >= 4);
  const theirs = ["name", "name:en", "name:cy", "name:gd", "alt_name", "official_name"]
    .flatMap((k) => (peak.tags?.[k] ?? "").split(/[/;]/))
    .map(normalise)
    .filter((s) => s.length >= 4);
  // Compare without spaces too, so "Catbells" matches "Cat Bells".
  const squash = (s: string) => s.replace(/ /g, "");
  return ours.some((a) =>
    theirs.some((b) => a === b || a.includes(b) || b.includes(a) || squash(a) === squash(b)),
  );
}

function metres(a: Point, b: Point) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}

function replaceSummit(text: string, id: string, at: Point, elevationM: number) {
  const start = text.indexOf(`id: "${id}"`);
  if (start === -1) return text;
  const pattern = /summit: \{ lat: [-\d.]+, lon: [-\d.]+, elevationM: \d+ \}/y;
  const at4 = (n: number) => Number(n.toFixed(4));
  const offset = text.indexOf("summit: {", start);
  pattern.lastIndex = offset;
  if (!pattern.test(text)) return text;
  const replacement = `summit: { lat: ${at4(at.lat)}, lon: ${at4(at.lon)}, elevationM: ${elevationM} }`;
  return text.slice(0, offset) + replacement + text.slice(pattern.lastIndex);
}
