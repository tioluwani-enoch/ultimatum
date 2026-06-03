import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      claudeDevApi(env),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg", "assets/summer-os-banner.png"],
        manifest: {
          name: "Ultimatum",
          short_name: "Ultimatum",
          description:
            "A local-first summer and life command center for training, food, routines, planning, and app-aware chat.",
          theme_color: "#0a0a0a",
          background_color: "#0a0a0a",
          display: "standalone",
          start_url: "/",
          scope: "/",
          icons: [
            {
              src: "/icon.svg",
              sizes: "192x192",
              type: "image/svg+xml",
              purpose: "any"
            },
            {
              src: "/icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"]
        }
      })
    ]
  };
});

function claudeDevApi(env: Record<string, string>): Plugin {
  return {
    name: "ultimatum-claude-dev-api",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req: any, res: any) => {
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "Method not allowed" });
          return;
        }

        const apiKey = env.ANTHROPIC_API_KEY;

        if (!apiKey || apiKey === "your_anthropic_api_key_here") {
          sendJson(res, 500, { error: "ANTHROPIC_API_KEY is not configured in .env." });
          return;
        }

        try {
          const body = await readRequestBody(req);
          const userMessage = String(body?.message || "").trim();

          if (!userMessage) {
            sendJson(res, 400, { error: "A message is required." });
            return;
          }

          const anthropicResponse = await fetch(ANTHROPIC_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
              model: env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
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
                    `App context:\n${JSON.stringify(body?.appContext || {}, null, 2)}\n\n` +
                    `User question:\n${userMessage}`
                }
              ]
            })
          });

          const data = await readJsonResponse(anthropicResponse);

          if (!anthropicResponse.ok) {
            sendJson(res, anthropicResponse.status, {
              error: data?.error?.message || `Claude API request failed with status ${anthropicResponse.status}.`
            });
            return;
          }

          sendJson(res, 200, { message: extractClaudeText(data) || "Claude returned an empty response." });
        } catch (error) {
          sendJson(res, 500, {
            error: error instanceof Error ? error.message : "Unexpected chat error."
          });
        }
      });
    }
  };
}

function sendJson(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function readRequestBody(req: any) {
  let raw = "";

  for await (const chunk of req) {
    raw += chunk;
  }

  return raw ? JSON.parse(raw) : {};
}

async function readJsonResponse(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text } };
  }
}

function extractClaudeText(data: any) {
  if (!Array.isArray(data?.content)) {
    return "";
  }

  return data.content
    .filter((part: any) => part?.type === "text" && typeof part.text === "string")
    .map((part: any) => part.text)
    .join("\n")
    .trim();
}
