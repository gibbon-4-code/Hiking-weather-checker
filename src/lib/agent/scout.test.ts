import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import type { ScoutAnswer } from "@/lib/agent/guardrail";
import { runScout } from "@/lib/agent/scout";
import { answer, plan, TODAY } from "@/lib/agent/test-fixtures";
import type { ScoutSource } from "@/lib/agent/tools";

const source: ScoutSource = { plan: async () => plan(), secondOpinion: async () => null, now: () => TODAY };

/**
 * A stand-in for Claude: each run of the Tool Runner gets the next canned answer. No API key, no
 * cost, the same result every time. It records the conversation it was sent on each run.
 */
function fakeClaude(replies: ScoutAnswer[]) {
  const conversations: Anthropic.Beta.BetaMessageParam[][] = [];
  const client = {
    beta: {
      messages: {
        toolRunner: (params: { messages: Anthropic.Beta.BetaMessageParam[] }) => {
          conversations.push(params.messages);
          const reply = replies[conversations.length - 1];
          const message = {
            role: "assistant" as const,
            content: [{ type: "text" as const, text: JSON.stringify(reply) }],
            stop_reason: "end_turn",
            usage: { input_tokens: 1000, output_tokens: 100 },
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
  };
  return { client: client as unknown as Anthropic, conversations };
}

const lastText = (conversation: Anthropic.Beta.BetaMessageParam[]) => String(conversation.at(-1)?.content);

describe("runScout", () => {
  it("accepts a good first answer without retrying", async () => {
    const { client, conversations } = fakeClaude([answer()]);
    const result = await runScout(source, client);
    expect(conversations).toHaveLength(1);
    expect(result.answer).toEqual(answer());
    expect(result.retried).toBeNull();
    expect(result.overruled).toBeNull();
  });

  it("tells Claude why a made-up hill failed, and accepts its second choice", async () => {
    const { client, conversations } = fakeClaude([answer({ mountainId: "sheltered-dyke" }), answer()]);
    const result = await runScout(source, client);

    expect(conversations).toHaveLength(2);
    // The retry continues the same conversation: the question, Claude's first answer, then the reason.
    const retry = conversations[1];
    expect(retry).toHaveLength(3);
    expect(retry[1].role).toBe("assistant");
    expect(lastText(retry)).toMatch(/failed a check.*no hill with the id "sheltered-dyke"/);

    expect(result.retried).toMatch(/sheltered-dyke/);
    expect(result.answer.mountainId).toBe("ditchling-beacon");
    expect(result.overruled).toBeNull();
  });

  it("tells Claude about an unsafe pick too", async () => {
    const { client, conversations } = fakeClaude([answer({ mountainId: "tryfan" }), answer()]);
    await runScout(source, client);
    expect(lastText(conversations[1])).toMatch(/unsafe.*gusts 60 mph/);
  });

  it("only retries once, then the code's skip stands", async () => {
    const bad = answer({ mountainId: "sheltered-dyke" });
    const { client, conversations } = fakeClaude([bad, bad, bad]);
    const result = await runScout(source, client);
    expect(conversations).toHaveLength(2);
    expect(result.answer.verdict).toBe("skip");
    expect(result.overruled).toMatch(/sheltered-dyke/);
  });

  it("doesn't retry a skip", async () => {
    const skip = answer({ verdict: "skip", mountainId: null, date: null });
    const { client, conversations } = fakeClaude([skip]);
    expect((await runScout(source, client)).answer.verdict).toBe("skip");
    expect(conversations).toHaveLength(1);
  });

  it("adds up the tokens from both attempts", async () => {
    const { client } = fakeClaude([answer({ mountainId: "sheltered-dyke" }), answer()]);
    const result = await runScout(source, client);
    expect(result.usage).toEqual({ input: 2000, output: 200 });
  });
});
