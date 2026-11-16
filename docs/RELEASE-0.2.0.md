# v0.2.0 — Stable Beta

This is the first **stable beta** of `dsh-info-check`, a confirmation-gate bundle
for DeepSeek Harness. It adds review points around agent work instead of letting
the agent run straight to a final answer.

## Highlights

- **Four confirmation gates**: intent check, one plan confirmation, per-milestone
  acceptance, and delivery sign-off.
- **Editable checklists**: every point has its own text box and a separate number
  badge; points can be added or removed and renumber automatically.
- **Free-form Notes** at the end of every confirmation, carried into the model
  result and the ledger.
- **Read-only acceptance/delivery reports**: the same point layout, with rework
  and adjustment reason dialogs.
- **Resizable dialogs**: drag the right edge; the maximum width equals the
  dialog height; double-click restores the default width.
- **Settings page**: milestone count, expectation level, countdown, detail
  question count, new-conversation default, ledger switch/path, and the current
  conversation switch.
- **Per-session switch** next to the composer/header, driven by a logged
  `/dsh-info-check on|off` command and a session projection.
- **Workspace ledger** under `.dsh-info-check/ledger.md`.

## Install

This beta is a **local DSH bundle**, not an npm package yet. See
[README.md](../README.md) for the profile/link installation steps. Users are
expected to clone this repository and add the bundle to their DSH profile.

The npm package name is still `@local/dsh-info-check` and the package is
`private: true`; publishing to npm is a later step.

## Compatibility

- DSH `0.2.2-rc.3` Desktop profile (tested).
- `engines.dsh`: `>=0.2.2-rc.3 <0.3.0`.
- Other DSH versions may work but are not verified.

## Verification

- `pnpm test` — pure logic and client smoke checks.
- `pnpm test:e2e` — component browser E2E with Playwright-core and a local
  fixture; covers the four panels, point boxes, notes, three detail questions,
  rework reason, read-only reports, resize and double-click reset.
- [docs/MANUAL-REGRESSION.md](../docs/MANUAL-REGRESSION.md) — fixed manual
  checklist for settings, session switch, live gates, ledger and timer paths.

The browser E2E needs Edge or Chrome and must run outside the DSH sandbox (or
with full access), because the sandbox blocks Chromium IPC.

## Known limitations

- Beta: settings/switch and live user-question transport are covered by the
  manual checklist, not by the component E2E.
- No npm release yet.
- No model-behavior test; the plugin validates the agent's payloads, not the
  quality of its questions.

## License

MIT. Copyright (c) 2026 pykkkkk (Wenhao Liu).
