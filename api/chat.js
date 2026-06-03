const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const userMessage = String(body?.message || "").trim();

    if (!userMessage) {
      return res.status(400).json({ error: "A message is required." });
    }

    const appContext = body?.appContext || {};

    const anthropicResponse = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 700,
        temperature: 0.4,
        system:
          "You are the in-app coach for Ultimatum, a personal summer and life PWA. " +
          "Use the provided app context to answer practically and concisely. " +
          "Prioritize the user's training, nutrition, planning, recovery, budget, and life goals. " +
          "For injury or health topics, be careful, avoid diagnosis, and recommend professional care for recurring or acute pain.",
        messages: [
          {
            role: "user",
            content:
              `App context:\n${JSON.stringify(appContext, null, 2)}\n\n` +
              `User question:\n${userMessage}`
          }
        ]
      })
    });

    const data = await anthropicResponse.json();

    if (!anthropicResponse.ok) {
      return res.status(anthropicResponse.status).json({
        error: data?.error?.message || "Claude API request failed."
      });
    }

    const text = extractClaudeText(data);
    return res.status(200).json({ message: text || "Claude returned an empty response." });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected chat error."
    });
  }
}

function extractClaudeText(data) {
  if (!Array.isArray(data?.content)) {
    return "";
  }

  return data.content
    .filter((part) => part?.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}
