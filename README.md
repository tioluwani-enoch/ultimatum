# Ultimatum

A local-first PWA for managing summer training, nutrition, routines, planning, life goals, and app-aware questions.

## Stack

- React
- TypeScript
- Vite
- Vite PWA
- Lucide React icons

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The app includes a PWA manifest and generated service worker so it can be installed after hosting.

## Claude chat

Copy `.env.example` to `.env`, then add your Anthropic key:

```bash
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
VITE_USE_CLAUDE_CHAT=true
VITE_CHAT_API_URL=/api/chat
```

The Claude key is server-only. Do not add it with a `VITE_` prefix.

For local Claude testing, use Vercel's dev server so `/api/chat` runs:

```bash
npx vercel dev
```

Plain `npm run dev` still runs the app, but it does not run the serverless Claude endpoint. When deployed on Vercel, set the same environment variables in the project settings. The frontend sends chat requests to `/api/chat`, and `api/chat.js` calls Claude securely from the serverless function.
