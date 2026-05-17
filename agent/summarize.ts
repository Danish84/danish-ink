import Anthropic from "@anthropic-ai/sdk";
import type { NormalizedItem } from "./rss";

export type Slot = "morning" | "evening";

export const SYSTEM_PROMPT = `You are the editor of a twice-daily world news briefing for a single, attentive reader. Your job is to synthesize RSS headlines from multiple publishers into a single, flowing narrative briefing - not a source-by-source roundup, not a list, and not bullet points.

Voice: confident, calm, lightly editorial. Connect related stories across outlets. When several sources appear to be covering the same event, treat that as corroborating context rather than repeating the story. Give context where useful. Do not pretend to know more than the headlines reveal.

Format: 4 to 7 short paragraphs of plain prose, separated by blank lines. No headers, no bullets, no bold text, no markdown formatting of any kind. Open with the most consequential story of the cycle. Close with a brief observation or a quieter human-interest note when one is available.

Never invent facts. If a story is ambiguous, hedge appropriately ("reports suggest", "according to early accounts"). Use source labels only as quiet context for your judgment; do not cite every sentence and do not organize the briefing by publisher.`;

export type SummarizeOptions = {
  items: NormalizedItem[];
  slot: Slot;
  client?: Anthropic;
  model?: string;
};

export function buildUserPrompt(items: NormalizedItem[], slot: Slot): string {
  const slotLabel = slot === "morning" ? "Morning Briefing" : "Evening Briefing";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const headlines = items
    .map((item) => {
      const desc = item.description ? ` - ${item.description}` : "";
      return `- [${item.source}] ${item.title}${desc}`;
    })
    .join("\n");

  return `Write today's ${slotLabel} for ${today} from the following headlines:\n\n${headlines}`;
}

export async function summarize(opts: SummarizeOptions): Promise<string> {
  const client =
    opts.client ??
    new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = opts.model ?? "claude-haiku-4-5";

  if (opts.items.length === 0) {
    throw new Error("summarize: refusing to call Claude with zero items");
  }

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      { role: "user", content: buildUserPrompt(opts.items, opts.slot) },
    ],
  });

  const block = message.content[0];
  if (!block || block.type !== "text") {
    throw new Error("summarize: no text block in Claude response");
  }
  return block.text.trim();
}
