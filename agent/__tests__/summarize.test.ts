import type Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import type { NormalizedItem } from "../rss";
import { buildUserPrompt, summarize, SYSTEM_PROMPT } from "../summarize";

const sampleItems: NormalizedItem[] = [
  {
    title: "Geneva talks reach preliminary agreement",
    description: "Three nations sign a framework after a week of negotiations.",
    source: "BBC World",
    pubDate: new Date("2026-05-16T09:00:00Z"),
  },
  {
    title: "Typhoon expected to make landfall Sunday",
    description: "Coastal areas under evacuation advisory.",
    source: "BBC World",
    pubDate: new Date("2026-05-16T08:30:00Z"),
  },
];

function mockClient(responseText = "Generated digest.") {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: responseText }],
  });
  return {
    client: { messages: { create } } as unknown as Anthropic,
    create,
  };
}

describe("buildUserPrompt", () => {
  it("includes the slot label and every headline+description", () => {
    const prompt = buildUserPrompt(sampleItems, "morning");
    expect(prompt).toContain("Morning Briefing");
    expect(prompt).toContain("Geneva talks reach preliminary agreement");
    expect(prompt).toContain("framework after a week");
    expect(prompt).toContain("[BBC World]");
  });

  it("switches the slot label for evening", () => {
    const prompt = buildUserPrompt(sampleItems, "evening");
    expect(prompt).toContain("Evening Briefing");
  });
});

describe("summarize", () => {
  it("calls Claude with the cached system prompt and returns the text", async () => {
    const { client, create } = mockClient("This is the briefing.");

    const result = await summarize({
      items: sampleItems,
      slot: "morning",
      client,
      model: "claude-sonnet-4-6",
    });

    expect(result).toBe("This is the briefing.");
    expect(create).toHaveBeenCalledOnce();

    const call = create.mock.calls[0][0];
    expect(call.model).toBe("claude-sonnet-4-6");
    expect(call.system).toEqual([
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ]);
    expect(call.messages[0].role).toBe("user");
    expect(call.messages[0].content).toContain("Geneva talks");
  });

  it("trims whitespace from the response", async () => {
    const { client } = mockClient("   spaced out   \n");
    const result = await summarize({
      items: sampleItems,
      slot: "morning",
      client,
    });
    expect(result).toBe("spaced out");
  });

  it("throws when there are no items rather than calling Claude", async () => {
    const { client, create } = mockClient();
    await expect(
      summarize({ items: [], slot: "morning", client }),
    ).rejects.toThrow(/zero items/);
    expect(create).not.toHaveBeenCalled();
  });

  it("throws when the response has no text block", async () => {
    const create = vi.fn().mockResolvedValue({ content: [] });
    const client = { messages: { create } } as unknown as Anthropic;
    await expect(
      summarize({ items: sampleItems, slot: "morning", client }),
    ).rejects.toThrow(/no text block/);
  });
});
