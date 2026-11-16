# v0.2.1 — Stable Beta

This release focuses on confirmation-card ergonomics and control. It is still a
source-available local DSH bundle, not an npm package.

## Changes since 0.2.0

- **Click-again to clear** a single-select detail option; multi-select still
  toggles independently.
- **“Other” input** on every option question; typed text travels in the answer
  `custom` field.
- **Auto-growing point boxes**: each point grows with its content instead of
  scrolling inside a short fixed-height box.
- **Pause task** on milestone acceptance: returns `decision=paused`; the agent
  organizes the current progress and ends the task instead of continuing.
- **Result file links**: `accept_milestone` accepts an optional `files` array of
  absolute paths; the acceptance card renders clickable paths and opens the file
  location in Explorer.
- **Milestone heading first**: the plan confirmation detail starts with a
  `里程碑` section showing the milestone id and title.
- **X means skip**: clicking the top-right X submits a skip answer; the tool
  continues with the agent's version instead of cancelling the turn.

## Compatibility

- DSH `0.2.2-rc.3` Desktop profile (tested).
- `engines.dsh`: `>=0.2.2-rc.3 <0.3.0`.
- Other DSH versions are unverified.

## Verification

- `pnpm test` — pure logic and client smoke checks.
- `pnpm test:e2e` — component browser E2E for the four panels, option toggling,
  Other input, auto height, pause, file-link command, rework, and X-skip.
- [docs/MANUAL-REGRESSION.md](../docs/MANUAL-REGRESSION.md) — fixed manual pass
  for settings, session switch, live gates, ledger, timer, and file links.

The browser E2E needs Edge or Chrome and must run outside the DSH sandbox (or
with full access), because the sandbox blocks Chromium IPC.

## Known limitations

- No npm release yet.
- Explorer opening is verified through the host command payload; the actual
  desktop behavior should be confirmed manually.
- No model-behavior test; the plugin validates payloads and UI, not the quality
  of the agent's questions.

## License

MIT. Copyright (c) 2026 pykkkkk (Wenhao Liu).
