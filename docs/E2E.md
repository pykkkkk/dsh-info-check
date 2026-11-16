# Browser E2E

A component-level browser test for the real `client.js` bundle. It does not use
the live DSH Web GUI, a login token, the model, or the network: `fixture.html`
loads the production client code and a small mock DSH host, then renders the
confirmation panels.

## Coverage

- Requirement card: one text box per point, separate number badge, add/remove,
  three detail questions, notes, answer payload.
- Detail interactions: single-select click-again-to-clear, custom “Other” input.
- Auto-growing point boxes: tall enough for content, no internal scroll.
- Plan card: point boxes, notes, approval payload.
- Acceptance card: read-only point rows, notes, timer stop, pause task,
  clickable result-file paths, approval payload.
- Rework branch: reason dialog and `需要返工` payload.
- Delivery card: read-only rows, notes, confirmation payload.
- Dialog resize: right-edge drag cannot exceed the current dialog height;
  double-click restores the default width.
- No uncaught page errors.

## Requirements

- Node.js 20+ (Node 24 tested).
- pnpm.
- Microsoft Edge or Google Chrome installed. Set `EDGE_PATH` or `CHROME_PATH`
  if it is not in a standard Windows location.
- Run the test **outside the DSH sandbox** (normal PowerShell), or with full
  access. The DSH sandbox blocks the browser's named-pipe/IPC channels, so
  Chromium cannot start under the default sandbox.

## Run

```powershell
cd "D:\dsh workspace\tool manage\dsh-info-check"
pnpm install
pnpm test:e2e
```

Screenshots of the intent and acceptance cards are written to
`test/e2e/artifacts/` (ignored by git).

## Files

- `fixture.html` — loads local React, the real `client.js`, and the fixture.
- `fixture.js` — mock DSH host, pending questions, and render helpers.
- `ui.e2e.mjs` — Playwright-core test; launches Edge/Chrome via CDP, then
  asserts the UI. It uses no browser download and no test-runner dependency.

## Limits

This is a UI component E2E, not a full DSH integration test. It does not cover
the settings panel, the per-session toggle, real user-question transport, the
ledger backend, or model behavior; use
[MANUAL-REGRESSION.md](MANUAL-REGRESSION.md) for those paths.
