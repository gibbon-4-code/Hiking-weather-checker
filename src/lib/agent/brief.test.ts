import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { BRIGHTON } from "@/data/mountains";
import { describeFilters, searchBrief, weekendBrief } from "@/lib/agent/brief";
import { runScout, scoutQuestion, scoutSystemPrompt } from "@/lib/agent/scout";
import { answer, plan, SATURDAY, TODAY } from "@/lib/agent/test-fixtures";
import { createScoutTools, type ScoutSource } from "@/lib/agent/tools";
import { DEFAULT_PREFERENCES } from "@/lib/scoring";
import type { Home } from "@/lib/types";

const LEEDS: Home = { label: "Leeds", postcode: null, lat: 53.8, lon: -1.55 };
const nearOnly = { ...DEFAULT_PREFERENCES, maxDriveMinutes: 60 };
const source: ScoutSource = { plan: async () => plan(), secondOpinion: async () => null, now: () => TODAY };

describe("searchBrief", () => {
  it("lets the Scout pick the chosen day or the day either side", () => {
    expect(searchBrief(LEEDS, DEFAULT_PREFERENCES, SATURDAY, TODAY).days).toEqual(["2026-10-03", "2026-10-02", "2026-10-04"]);
  });

  it("leaves out a day before today", () => {
    expect(searchBrief(LEEDS, DEFAULT_PREFERENCES, "2026-09-29", TODAY).days).toEqual(["2026-09-29", "2026-09-30"]);
  });

  it("describes the filters in words", () => {
    expect(describeFilters({ ...DEFAULT_PREFERENCES, maxDriveMinutes: 120, walk: "half" })).toBe(
      "a drive of up to 2 hrs and a walk of 3 to 5 hours",
    );
    expect(describeFilters(DEFAULT_PREFERENCES)).toBe("");
  });
});

describe("the Scout's briefing", () => {
  it("names the starting point, the day and the filters for a search", () => {
    const brief = searchBrief(LEEDS, nearOnly, SATURDAY, TODAY);
    const prompt = scoutSystemPrompt(TODAY, brief);
    expect(prompt).toContain("setting off from Leeds and want a drive of up to 1 hr");
    expect(prompt).toContain("They've asked about Saturday 3 Oct (2026-10-03)");
    expect(scoutQuestion(brief)).toBe("Is Saturday 3 Oct a good day for a hill walk from Leeds? If so, where should I go?");
  });

  it("keeps the original weekend wording", () => {
    expect(scoutSystemPrompt(TODAY, weekendBrief(TODAY))).toContain("lives in Brighton decide whether this weekend");
  });
});

describe("get_day_ranking", () => {
  const ranking = async (brief = searchBrief(BRIGHTON, nearOnly, SATURDAY, TODAY), date = SATURDAY) => {
    const [tool] = createScoutTools(source, brief);
    return String(await tool.run(tool.parse({ date })));
  };

  it("only shows hills inside the person's drive limit", async () => {
    const text = await ranking();
    expect(text).toContain("Ditchling Beacon");
    expect(text).not.toContain("Tryfan");
  });

  it("refuses days outside the brief", async () => {
    expect(await ranking(undefined, "2026-10-08")).toMatch(/can only look at 2026-10-03, 2026-10-02, 2026-10-04/);
  });
});

describe("runScout on a search", () => {
  it("rejects a pick beyond the person's drive limit, using their filters", async () => {
    const conversations: unknown[] = [];
    const replies = [answer({ mountainId: "tryfan" }), answer()];
    const client = {
      beta: {
        messages: {
          toolRunner: (params: { messages: unknown[] }) => {
            conversations.push(params.messages);
            const message = {
              role: "assistant" as const,
              content: [{ type: "text" as const, text: JSON.stringify(replies[conversations.length - 1]) }],
              stop_reason: "end_turn",
              usage: { input_tokens: 1, output_tokens: 1 },
            };
            return {
              params: { ...params, messages: [...params.messages, { role: "assistant", content: message.content }] },
              async *[Symbol.asyncIterator]() {
                yield message;
              },
            };
          },
        },
      },
    } as unknown as Anthropic;

    const result = await runScout(source, client, undefined, searchBrief(BRIGHTON, nearOnly, SATURDAY, TODAY));
    // Tryfan is unsafe in the test plan anyway; either way it's not allowed, so Claude is asked again.
    expect(result.retried).toMatch(/Tryfan/);
    expect(result.answer.mountainId).toBe("ditchling-beacon");
    expect(String((conversations[0] as { content: string }[])[0].content)).toContain("from Brighton");
  });
});
