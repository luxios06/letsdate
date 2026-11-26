# Architecture

## Overview

letsdate uses a static React application plus a model-agnostic analysis protocol. There is no letsdate backend in the MVP, so user material travels directly from the browser to the model endpoint selected by the user.

```text
Browser
├── React workspace
├── Tesseract.js OCR
├── zod report validation
├── localStorage / sessionStorage
└── provider adapters
    ├── OpenAI-compatible
    ├── DeepSeek
    ├── Anthropic
    ├── Gemini
    └── Ollama

public/skills/letsdate-relationship-analysis/SKILL.md
└── system prompt + JSON contract used by all providers
```

## Why static first

- GitHub Pages can host the demo without managing a backend.
- Users can bring their own API key.
- The Agent Skill remains portable across tools.
- The MVP makes the data flow visible and avoids silently collecting private messages.

## Provider adapters

`src/lib/providers.ts` exposes a single `analyzeWithProvider` function and implements:

- OpenAI-compatible `/chat/completions`.
- Anthropic `/v1/messages`.
- Gemini `:generateContent`.
- Ollama `/api/chat`.
- Local demo fallback.

Model output is normalized and merged with a local fallback report so a partially malformed model response cannot break the entire interface.

## Analysis contract

The model receives `public/skills/letsdate-relationship-analysis/SKILL.md` and its selected references as system instructions plus a structured user payload. The skill requires:

- evidence before trait synthesis;
- separate MBTI, Big Five, interaction and interest analysis;
- explicit confidence;
- alternative explanations;
- a relationship decision with safety boundaries;
- a single valid JSON object.

## Browser storage

- Analysis history: `localStorage`.
- Provider preference and model: `localStorage`.
- API key: `sessionStorage` by default.
- API key persistence requires an explicit user opt-in.

No analytics or letsdate-owned database is included.

## Deployment

GitHub Actions:

1. Install dependencies with frozen lockfile.
2. Run unit tests.
3. Build with Vite.
4. Upload `dist`.
5. Deploy to GitHub Pages.

Vite uses the `/letsdate/` base path when `GITHUB_ACTIONS` is set.

## Production evolution

A future server-backed version should add:

- OAuth and platform authorization.
- Envelope encryption for message content.
- User-controlled retention and deletion.
- Rate limiting, abuse prevention and audit logs.
- A provider proxy to avoid browser CORS issues.
- Prompt injection isolation for imported platform content.
- Evaluation sets for personality stability and relationship-signal calibration.
