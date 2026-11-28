# WechatVibe 复用评估

Reviewed source: [tswawa/WechatVibe](https://github.com/tswawa/WechatVibe)

- Version reviewed: `1.3.6`
- License: Apache-2.0
- Repository tree: 397 files
- Date: 2026-11-26

## Inventory

The full source tree was inspected by directory and dependency role:

| Area | Main files | Purpose | Decision |
| --- | --- | --- | --- |
| Advisor contracts and store | `bridge/advisor_contracts.py`, `advisor_store.py`, `advisor_service.py` | Built-in assistants, imported Skills, revisions, budgets and history | Reuse concepts only |
| Skill package importer | `bridge/advisor_packages.py`, `advisor_imports.py` | Bounded SKILL.md/ZIP import, reference selection, inert package model | Reuse progressive-disclosure and safety ideas |
| Advisor runtime | `electron/advisor-runtime.ts`, `bridge/advisor_runtime.py`, `scripts/advisor-worker.ts` | OpenCode Agent process and JSONL transport | Do not import |
| Built-in advisors | Advisor presets in `advisor_contracts.py` | Advisor, empathy and reflection structures | Reimplement as new reference guidance |
| Model connectors | `electron/model-connectors.ts` | OpenAI Responses/Chat, Anthropic, Gemini, Ollama, URL and response guards | Reuse security and error-handling patterns |
| Portrait classifier | `electron/api-portrait-classifier.ts` | Fixed-question batch classification and normalized answers | Reuse evidence-first classification principles |
| Portrait evidence | `electron/api-portrait-evidence.ts` | Exact quote verification, source ledger, observation compression | Reuse ledger model; new TypeScript implementation |
| Portrait synthesis | `electron/api-portrait.ts` | Provenance checks, MBTI evidence gates, uncertainty | Reuse thresholds and support rules |
| Local personality | `electron/laya/personality.ts`, `scoring.ts`, `calibration.ts` | MBTI insufficient option, probability calibration, relationship scoring | Reuse uncertainty and calibration principles |
| API guidance | `electron/api-guidance.ts` | Subtext, scenario reading, strategies and reply options | Reuse self-voice matching and status contract |
| Reply options | `electron/api-reply-options.ts` | Three bounded replies, no tools, no fabrication | Reuse three-option action design |
| Local Laya model | `electron/laya/**`, `scripts/setup-models.ts` | ONNX multilingual local inference, model download and validation | Do not import |
| WeChat reader | `native-reader/**`, `bridge/wechat_source.py` | Windows WeChat read-only database and UI access | Reference protocol only |
| Desktop UI | `chatui/**`, Electron preload/main scripts | Windows desktop application | Do not import |
| Tests | `bridge/test_*.py`, `tests/**` | Extensive regression suite for the desktop app | Reference only |

## Adopted Into letsdate

### Evidence ledger

letsdate now requires:

- Exact continuous quotes.
- Stable evidence IDs.
- `confirmed`, `tentative`, or `insufficient` status.
- Explicit alternative explanations.
- Separate SELF, OTHER and dyadic attribution.

### MBTI evidence gates

Each axis now has:

- `insufficient`, `tentative`, or `supported` status.
- Evidence IDs.
- A neutral score and `证据不足` label when unsupported.
- A `待观察` candidate when more than one axis lacks evidence.

This prevents a short warm conversation from producing a confident four-letter type.

### Score calibration

Compatibility and interest scores now:

- Count the other person's messages rather than total text lines.
- Shrink toward 50 when evidence is thin.
- Use caps of 70, 86 or 94 depending on sample quality.
- Never return 100 from text-only evidence.
- Record reliability, sample size and cap in the report.
- Derive the relationship decision from the calibrated score.

### Reply generation

The action layer now:

- Learns observable voice features from the user's own turns.
- Reuses concrete dates and activities already present in the conversation.
- Produces three tones: make-space, direct confirmation and lighter wording.
- Does not invent restaurants, events or commitments.
- Includes positive and cold-response branches.

### Model boundary checks

The browser provider layer now:

- Requires HTTPS for remote endpoints.
- Rejects credentials, query strings and fragments in Base URLs.
- Applies a 120-second timeout.
- Rejects responses above 2MB.
- Does not echo raw provider response bodies into the UI.
- Validates the final report with `zod` before rendering.

### Progressive references

The letsdate Skill is split into:

- Main protocol.
- Evidence rubric.
- Calibration and uncertainty.
- Action and reply generation.

The web app loads only these bounded references rather than placing the entire repository into context.

## Not Adopted

### OpenCode and Electron runtime

WechatVibe needs a Windows Agent runtime, isolated WebContentsView and OpenCode process. letsdate is currently a static, cross-model Web App. Importing this runtime would add large binaries, platform coupling and operational complexity without improving the MVP.

### Laya ONNX model

The local Laya model is useful for offline desktop inference, but the model package is hundreds of megabytes and requires ONNX runtime and tokenizer assets. letsdate currently uses:

- A deterministic local demo.
- User-selected cloud or Ollama models.

Local web inference can be revisited after the cloud workflow is validated.

### WeChat native reader

WechatVibe reads locally stored WeChat 4.x SQLCipher shards on Windows. Its reader:

- discovers `xwechat_files` and the active account;
- locates a bounded raw-key candidate already cached by the local WeChat process;
- validates and decrypts database pages in memory;
- replays committed WAL frames;
- opens a decrypted in-memory SQLite image and queries text messages;
- keeps keys in memory and never writes decrypted source databases;
- requires Windows, WeChat 4.x, Python dependencies and a desktop runtime.

A static GitHub Pages application cannot perform any of those reads. Browsers cannot enumerate `xwechat_files`, inspect another process's memory, or open a SQLCipher database with local keys. Adding that capability to the public website would also create unacceptable key-handling and cross-platform risk.

The MVP therefore implements multi-image OCR for every platform. A future WeChat import would need a separate, explicitly installed local bridge with:

- Windows-only capability detection.
- Loopback-only communication with origin checks.
- A visible account and conversation picker.
- Read-only message retrieval with no key persistence.
- User-controlled date range and message limit.
- Encryption at rest for any temporary cache.
- Explicit confirmation before sending selected text to a cloud model.

Until that bridge exists, letsdate will not claim to read WeChat directly and will not ask users to paste database keys into the website.

### Provider SDKs

WechatVibe pins the OpenAI, Anthropic, Gemini and Ollama SDKs. letsdate uses browser `fetch` with explicit protocol adapters, so these SDKs are unnecessary for the static build.

## Installed Dependency

`zod` is now a production dependency. It validates:

- Score ranges.
- Required report sections.
- MBTI/Big Five statuses.
- Evidence and action shapes.
- Calibrated report consistency before rendering.

PyYAML was installed only into `work/pydeps` for the Skill validator. It is not shipped with letsdate.

## License Position

WechatVibe concepts and implementation patterns were reviewed under Apache-2.0.

letsdate introduces original TypeScript implementations for:

- Calibration.
- Reference loading.
- Report validation.
- Reply-option generation.

No WechatVibe desktop, WeChat reader, model weights or proprietary user assets were copied into the deployed product.

## Strict comparison: 2026-11-28

### Where WechatVibe is stronger

| Capability | WechatVibe | letsdate |
| --- | --- | --- |
| Full-history ingestion | Reads Windows WeChat 4.x shards directly | Screenshots, pasted text and future opt-in native bridge |
| Message-level analysis | Emotion and intent labels across loaded messages | Local per-message emotion, intent and relationship cues; exact-quote model enhancement |
| Local inference | Bundled local Laya model option | Deterministic local rules plus optional Ollama model |
| Account isolation | Per-WeChat-account source and analysis storage | Per-browser storage and relationship alias |
| Desktop workflow | Electron shell, account picker and conversation browser | Cross-platform PWA |

WechatVibe has a real advantage in depth of message acquisition. letsdate should not pretend screenshot OCR matches native database access.

### Where letsdate is stronger

1. **Cross-platform and platform-agnostic**: it is not tied to Windows or one WeChat version.
2. **Dyadic rather than single-speaker**: it analyzes both people and their interaction, not only one person's messages.
3. **Relationship decision layer**: personality is connected to reciprocity, interest, compatibility, safety and a concrete next action.
4. **Safety guardrail**: control and boundary risks force `暂缓推进`, even if the conversation is warm.
5. **Evidence-linked explanation**: exact quotes, alternatives and retrieved-case context remain separate.
6. **Portable Agent Skill**: the same protocol works across OpenAI, DeepSeek, Anthropic, Gemini, Ollama and compatible APIs.
7. **Longitudinal relationship history**: a local relationship alias connects repeated analyses and shows score changes.

### Current shortcomings

- No native full-history import comparable to WechatVibe.
- Per-message labels are latest-state labels, not yet a longitudinal emotion/intent timeline.
- No bundled local foundation model; deep synthesis depends on an API or a separately installed Ollama model.
- No server-backed account isolation, encryption or cross-device sync.
- Personality scoring remains a communication heuristic, not a validated psychological instrument.
- The knowledge base has only 95 anonymized or synthetic cases.

### Priority decisions

- Do not copy the Windows WeChat reader into GitHub Pages.
- Keep multi-image OCR and future loopback bridge as separate acquisition paths.
- Compete on relationship interpretation and decision quality, not raw message volume.
- Preserve the safety override and evidence ledger as non-negotiable product advantages.
- Make longitudinal change and actionable communication visible in the UI, not just in documentation.
