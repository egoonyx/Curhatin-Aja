// Anthropic (Claude) helper for the Marketing content-analysis feature.
// Requires ANTHROPIC_API_KEY. If it's missing, callers should gracefully
// skip the AI analysis and still save the link + any manually-entered
// metrics.

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export function isAiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

async function fetchPageText(url: string): Promise<{ title: string | null; text: string }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CurhatinAjaBot/1.0)" },
    });
    if (!res.ok) return { title: null, text: "" };
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const descMatch = html.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
    );
    const ogDescMatch = html.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i
    );

    // very rough visible-text extraction: strip tags/scripts/styles
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const desc = descMatch?.[1] ?? ogDescMatch?.[1] ?? "";
    const text = [desc, stripped].filter(Boolean).join("\n\n").slice(0, 6000);

    return { title: titleMatch?.[1]?.trim() ?? null, text };
  } catch {
    return { title: null, text: "" };
  }
}

export type ContentAnalysis = {
  title: string | null;
  summary: string;
  tone: string;
  topics: string[];
  suggestions: string;
};

export async function analyzeContentLink(url: string): Promise<ContentAnalysis | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const { title, text } = await fetchPageText(url);
  if (!text) return null;

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content:
              `You're helping a marketing team analyze a piece of published content.\n` +
              `Here is the page text/description (may be partial):\n\n${text}\n\n` +
              `Reply with ONLY valid JSON, no markdown fences, matching exactly this shape:\n` +
              `{"summary": "2-3 sentence summary", "tone": "one or two words describing tone", ` +
              `"topics": ["short topic", "short topic"], "suggestions": "1-2 sentence improvement suggestion"}`,
          },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const raw: string = data?.content?.[0]?.text ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      title,
      summary: String(parsed.summary ?? ""),
      tone: String(parsed.tone ?? ""),
      topics: Array.isArray(parsed.topics) ? parsed.topics.map(String) : [],
      suggestions: String(parsed.suggestions ?? ""),
    };
  } catch {
    return null;
  }
}
