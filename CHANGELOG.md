# Changelog

All notable changes to this bundle are documented here. The project uses a
simple `MAJOR.MINOR.PATCH` version; DSH compatibility is pinned by
`engines.dsh`.

## 0.2.0 — 2026-11-16

- Four confirmation gates: intent check, one plan confirmation, per-milestone
  acceptance, and delivery sign-off.
- Floating, centered dialogs with the DeepSeek Blue palette, responsive sizing
  (max 75% of the viewport on each axis), editable plan sections, and read-only
  acceptance/delivery reports.
- Configurable countdown (default 60 seconds) with a **Stop timer** action.
- Settings window: milestone count, expectation level (perfect/good/pass),
  auto-skip timeout, detail-question count, new-conversation default, ledger
  switch/path, and a current-conversation switch. Saved through DSH's
  `remote.settings` as volatile Config, so changes apply without a restart.
- “Needs rework / Needs adjustment” opens a second dialog for notes; the notes
  return to the model as `feedback` for revision.
- Per-conversation enable switch next to the agent-preset (“创造模式”) chip,
  driven by a logged `/dsh-info-check on|off` command and a session projection.
- Workspace ledger under `.dsh-info-check/ledger.md`.
- No npm dependencies: the Host half imports only Node built-ins and loads the
  schemastery bundled with the running DSH installation when Config is needed.
- Open-source packaging: MIT license, README, CI, contribution and security
  notes, and a manual test plan.

## 0.1.0 — 2026-11-16

- Initial local bundle: intent check, milestone confirmation, ledger, composer
  switch.
