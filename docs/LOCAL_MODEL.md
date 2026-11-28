# Local Model

letsdate supports two local labeling paths.

## Built-in local rules

Every analysis creates one primary emotion, one communication intent and one relationship cue per message using deterministic TypeScript rules.

This path:

- requires no API key;
- adds no model request;
- works on mobile;
- favors safety by detecting control, boundary and repair language first;
- keeps labels as observable communication descriptions rather than hidden-motive claims.

## Optional Ollama enhancement

Select `Ollama 本地模型` in settings to run analysis and message-label enhancement on the user's machine.

Recommended setup:

1. Install Ollama.
2. Pull a Chinese-capable model, for example `ollama pull qwen3:8b`.
3. Start the local service.
4. In letsdate settings, use `http://localhost:11434` and the pulled model name.

The browser still uses the same two-stage report pipeline. The first model stage is also asked for per-message labels. Each returned label is accepted only when its `messageId` and exact quote match a real message; invalid labels fall back to the deterministic local result.

If GitHub Pages is blocked by Ollama CORS or private-network rules, configure the authorized origin or run letsdate locally. The exact Ollama desktop behavior varies by operating system and app version.

## Why the WechatVibe Laya model is not bundled

WechatVibe 1.3.6 uses an external Laya model package:

- ZIP: 599,362,786 bytes.
- `model.onnx`: 646,870,871 bytes.
- tokenizer: about 34MB.

It runs through an Electron/Python desktop stack. Loading that package into a GitHub Pages web app would make first use extremely large, stress mobile memory and differ from the model's validated desktop runtime.

letsdate therefore keeps:

- lightweight local rules for immediate web use;
- Ollama as the optional local LLM path;
- a future desktop bridge or packaged app as the correct place for a bundled model.

## Privacy

- Local-rule labels never leave the browser.
- Ollama requests go to the configured loopback address.
- Remote providers may receive the chat text required for analysis.
- No local model key or decrypted third-party database is stored by letsdate.
