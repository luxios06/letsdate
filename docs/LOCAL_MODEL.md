# Local Model

letsdate supports three local paths.

## Built-in local rules

Every analysis creates one primary emotion, one communication intent and one relationship cue per message using deterministic TypeScript rules.

This path:

- requires no API key;
- adds no model request;
- works on mobile;
- favors safety by detecting control, boundary and repair language first;
- keeps labels as observable communication descriptions rather than hidden-motive claims.

## One-click browser model

Select `浏览器本地模型` in settings and click `下载并启用`.

- Model: `Qwen3-0.6B-Q8_0.gguf`.
- Source: ModelScope `Qwen/Qwen3-0.6B-GGUF`.
- Size: 639,446,688 bytes.
- Runtime: Wllama 4 + llama.cpp WebAssembly.
- Acceleration: WebGPU when available, WebAssembly CPU fallback.
- Cache: origin-private file system, reused on later visits.
- Network: the 610MB model file is downloaded once; no letsdate server is involved.
- Chat data: message-label inference happens inside the browser.

The browser model labels up to the first 16 messages. The remaining messages retain deterministic local labels. A desktop browser with at least 8GB memory is recommended; mobile browsers may refuse the model due to storage or memory limits.

The model output is safety-merged with local rules. A local model cannot downgrade a detected control, location, phone-checking or social-isolation label.

## Optional Ollama enhancement

Select `Ollama 本地模型` in settings to run analysis and message-label enhancement on the user's machine.

Recommended setup:

1. Install Ollama.
2. Pull a Chinese-capable model, for example `ollama pull qwen3:8b`.
3. Start the local service.
4. In letsdate settings, use `http://localhost:11434` and the pulled model name.

The browser still uses the same two-stage report pipeline. The first model stage is also asked for per-message labels. Each returned label is accepted only when its `messageId` and exact quote match a real message; invalid labels fall back to the deterministic local result.

If GitHub Pages is blocked by Ollama CORS or private-network rules, configure the authorized origin or run letsdate locally. The exact Ollama desktop behavior varies by operating system and app version.

## Why the WechatVibe Laya package is not copied directly

WechatVibe 1.3.6 uses an external Laya model package:

- ZIP: 599,362,786 bytes.
- `model.onnx`: 646,870,871 bytes.
- tokenizer: about 34MB.

It runs through an Electron/Python desktop stack. letsdate uses a separately sourced Qwen3 GGUF and Wllama instead of redistributing that package, so the model has a documented domestic source, explicit license and a browser-compatible runtime.

letsdate therefore keeps:

- lightweight local rules for immediate web use;
- a one-click browser Qwen3 model;
- Ollama as the optional local LLM path;
- a future desktop package for users who need larger local models.

## Privacy

- Local-rule labels never leave the browser.
- Browser-model inference stays inside the browser and its OPFS cache.
- Ollama requests go to the configured loopback address.
- Remote providers may receive the chat text required for analysis.
- No local model key or decrypted third-party database is stored by letsdate.
