# letsdate Local Model

For most users, use the built-in `浏览器本地模型` option in letsdate settings: it downloads Qwen3-0.6B from ModelScope, caches it in the browser and requires no terminal commands.

The scripts below are the Ollama fallback for users who prefer an external local runtime or need a larger model.

This optional package runs a domestic-network-friendly local model:

- Model source: `Qwen/Qwen3-0.6B-GGUF` on ModelScope.
- Download: `Qwen3-0.6B-Q8_0.gguf`, 639,446,688 bytes.
- SHA-256: `9465e63a22add5354d9bb4b99e90117043c7124007664907259bd16d043bb031`.
- Runtime: Ollama.
- Local model name: `letsdate-qwen3:0.6b`.
- License: Apache-2.0.

The GGUF file is not committed to Git.

## Install

Install Ollama first, then start it.

macOS / Linux:

```bash
bash local-model/install.sh
```

Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File local-model/install.ps1
```

The scripts download from ModelScope, verify size and SHA-256, create the Ollama model and keep the source file in `local-model/models/`.

## Browser CORS

For the GitHub Pages build, the Ollama server must allow the letsdate origin.

macOS / Linux example:

```bash
OLLAMA_ORIGINS="https://luxios06.github.io,http://localhost:*,http://127.0.0.1:*" ollama serve
```

Windows install script stores `OLLAMA_ORIGINS` at user scope; restart Ollama afterward.

Do not use `OLLAMA_ORIGINS=*` unless the local service is otherwise isolated.

## Connect

In letsdate settings:

```text
Provider: Ollama 本地模型
Base URL: http://127.0.0.1:11434
Model: letsdate-qwen3:0.6b
```

Verify:

```bash
pnpm model:check
```

## Performance and limits

- Qwen3-0.6B is chosen for broader laptop compatibility and domestic download access.
- The Q8_0 file is about 610MB; runtime memory is higher.
- It is a small model and can make more mistakes than larger cloud models.
- First report generation is slower because the model must load.
- Deterministic per-message labels remain available even without the model.
- For better quality on a larger machine, replace the Ollama model name in letsdate settings with a larger local Qwen model.

## Privacy

- Model downloads come from ModelScope.
- Inference happens through the user's loopback Ollama service.
- letsdate does not upload chat text to its own server.
- No database key or WeChat source file is used by this local model.
