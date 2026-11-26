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
| WeChat reader | `native-reader/**`, `bridge/wechat_source.py` | Windows WeChat read-only database and UI access | Do not import |
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

The native reader is Windows-specific and accesses local WeChat data. letsdate deliberately does not log in to or scrape third-party platforms in the MVP.

Platform import should only be added with explicit authorization, transparent permissions and encrypted storage.

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
