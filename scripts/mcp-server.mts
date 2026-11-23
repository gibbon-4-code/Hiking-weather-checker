/**
 * Summit Planner as an MCP server, so Claude (Desktop, Code, or any MCP client) can ask for a ranked
 * list of suitable hikes. It runs the same ranking as the results page and the Scout.
 *
 *   npm run --silent mcp     speaks MCP over stdin/stdout
 *
 * stdout carries the protocol, so nothing here may print to it; log with console.error.
 * Keys come from .env.local as usual: none are required, ORS_API_KEY gives real drive times and
 * MET_OFFICE_API_KEY enables get_second_opinion.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MOUNTAINS } from "@/data/mountains";
import { describeWeather, formatRanking, rankDay } from "@/lib/agent/ranking";
import { defaultHikeDate, isPlannableDate } from "@/lib/dates";
import { resolveHome } from "@/lib/home";
import { buildPlan, buildSecondOpinion } from "@/lib/plan";
import { LocationError } from "@/lib/providers/location";
import { DEFAULT_PREFERENCES, summariseDay } from "@/lib/scoring";

const DISCLAIMER =
  "These scores are a planning aid, not a safety call. Check the Met Office mountain forecast or MWIS on the day.";

const server = new McpServer({ name: "summit-planner", version: "0.1.0" });

const text = (t: string, isError = false) => ({ content: [{ type: "text" as const, text: t }], isError });

server.registerTool(
  "find_hikes",
  {
    title: "Find suitable hikes",
    description:
      "Ranks about 200 hill walks across England, Wales and Scotland for one day, from a starting point in Great " +
      "Britain. The score weighs the weather during walking hours (09:00 to 16:00), the drive and how good the walk " +
      "is. Returns each hill's id, score out of 100, difficulty, wind exposure, drive time and weather. Hills marked " +
      "UNSAFE fail a hard safety rule (dangerous gusts, thunder, heavy snow or severe wind chill) and must not be " +
      "recommended. Call once per day to compare days.",
    inputSchema: {
      date: z
        .string()
        .optional()
        .describe("The day, written YYYY-MM-DD, from today up to 13 days ahead. Defaults to the coming Saturday."),
      from: z.string().optional().describe("Where they set off from: a UK postcode or a town. Defaults to Brighton."),
      maxDriveMinutes: z.number().int().positive().optional().describe("Longest drive they'll accept, in minutes."),
      walk: z
        .enum(["short", "half", "full"])
        .optional()
        .describe("Walk length: short is up to 3 hours, half is 3 to 5 hours, full is 5 hours or more."),
      limit: z.number().int().min(1).max(25).optional().describe("How many hills to return. Defaults to 10."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ date = defaultHikeDate(), from, maxDriveMinutes, walk, limit = 10 }) => {
    if (!isPlannableDate(date)) {
      return text(`Can't plan ${date}: pick a day from today up to two weeks ahead, written YYYY-MM-DD.`, true);
    }
    let home;
    try {
      home = await resolveHome(from);
    } catch (err) {
      if (err instanceof LocationError) return text(err.message, true);
      throw err;
    }
    const plan = await buildPlan(date, home);
    const prefs = { ...DEFAULT_PREFERENCES, maxDriveMinutes: maxDriveMinutes ?? null, walk: walk ?? null };
    const ranking = formatRanking(date, rankDay(plan, prefs, limit));
    const notes = plan.notices.length ? `\n\nNotes: ${plan.notices.join(" ")}` : "";
    return text(`Starting from ${home.label}.\n${ranking}${notes}\n\n${DISCLAIMER}`);
  },
);

server.registerTool(
  "get_second_opinion",
  {
    title: "Met Office second opinion",
    description:
      "Gets the Met Office forecast for one hill on one day, as a second opinion on the forecast behind find_hikes. " +
      "Useful when a pick looks borderline. Only works up to about 6 days ahead and needs a Met Office key.",
    inputSchema: {
      mountainId: z.string().describe("The hill's id, as shown by find_hikes."),
      date: z.string().describe("The day, written YYYY-MM-DD."),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  },
  async ({ mountainId, date }) => {
    const mountain = MOUNTAINS.find((m) => m.id === mountainId);
    if (!mountain) return text(`There's no hill with the id "${mountainId}".`, true);
    const forecast = await buildSecondOpinion(mountainId, date);
    const summary = forecast?.days[0] ? summariseDay(forecast.days[0]) : null;
    if (!summary) return text(`No Met Office forecast is available for ${mountain.name} on ${date}.`);
    return text(`Met Office for ${mountain.name} on ${date}, walking hours: ${describeWeather(summary)}.`);
  },
);

await server.connect(new StdioServerTransport());
console.error("Summit Planner MCP server ready on stdio");
