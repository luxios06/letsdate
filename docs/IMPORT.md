# Chat Import

letsdate currently supports two import paths:

1. Paste or edit text directly.
2. Select up to 12 screenshots at once for browser OCR.

The second path is the default answer to the current screenshot workflow.

## Batch screenshot behavior

- Accepts PNG, JPEG, WebP, BMP, GIF, HEIC and HEIF file types when the browser can decode them.
- Rejects non-images, empty files and files over 25MB.
- Processes at most 12 images per batch.
- Preserves selection order.
- Reuses one PaddleOCR engine across the batch.
- Shows each file's status instead of a single blocking spinner.
- Continues after an individual failure.
- Merges only successful text.
- Removes repeated adjacent message lines at screenshot boundaries.
- Appends to the current textarea so manual edits are retained.

The resulting transcript should still be reviewed before analysis because bubble-side speaker inference and overlapping screenshots are approximate.

## Why not direct WeChat import in the web app

Direct WeChat reading requires desktop and operating-system access. The reviewed WechatVibe implementation is a read-only Windows WeChat 4.x reader built with Electron, Python and `wechatauto-replica`. It discovers local database shards, obtains a cached process key, decrypts SQLCipher pages in memory and queries message tables.

That architecture cannot run inside a static browser app. A browser cannot enumerate the WeChat data folder, inspect another process or handle SQLCipher keys safely.

## Future local bridge

A future letsdate desktop bridge should be opt-in and separate from the public website.

Minimum contract:

- Local loopback service only.
- Allowlisted letsdate origin.
- No database key returned to the page.
- Account and conversation selection in the native layer.
- Date range and maximum message count.
- Text messages only; media remains labeled.
- Read-only source access.
- In-memory decryption and bounded temporary storage.
- No automatic cloud upload.
- Explicit preview and confirmation before analysis.

The bridge should never expose a raw database key, full filesystem path or unrelated conversation to the web application.
