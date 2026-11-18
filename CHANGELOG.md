# Changelog

All notable changes to this bundle are documented here. The project uses a
simple `MAJOR.MINOR.PATCH` version; DSH compatibility is pinned by
`engines.dsh`.

## 0.2.2 — 2026-11-17

- Task progress bar above the message box: one line-drawn stone tablet per
  milestone, with per-session progress, faster forward motion, a hold before
  acceptance, a fast jump when accepting, and hiding after delivery. Hovering a
  tablet shows its title. The milestone list locks after plan confirmation, and
  supervision mode can be strict or advisory.
- Task retrospectives: after a confirmed delivery, write a review to a single
  `.dsh-info-check/retrospectives.md` file.
- Optional automatic retrospective. When off, delivery asks whether to review
  the task; skip leaves the ledger clean for the next task.
- Every three completed tasks, update a length-limited
  `.dsh-info-check/quality-standard.md` from accumulated reviews; the manual
  section is preserved.
- Inject the quality standard into later task instructions.
- Commands: `/dsh-info-check retrospective` and `/dsh-info-check quality`.

## 0.2.1 — 2026-11-16

- Detail questions: single-select options toggle off on a second click; every
  option question has a free-form “Other” input.
- Point boxes grow with their content instead of using fixed-height scrollers.
- Milestone acceptance adds a **Pause task** action and an optional `files`
  list whose paths open the file location in Explorer.
- The milestone confirmation detail starts with a `里程碑` section showing the
  milestone id and title.
- Top-right X means skip: the tool continues with the agent's version instead
  of cancelling the turn.

## 0.2.0 — 2026-11-16

- Four confirmation gates: intent check, one plan confirmation, per-milestone
  acceptance, and delivery sign-off.
- Floating, centered dialogs with the DeepSeek Blue palette, responsive sizing
  (max 75% of the viewport on each axis), editable plan sections, and read-only
  acceptance/delivery reports.
- Configurable countdown (default 60 seconds) with a **Stop timer** action.
- Dialogs are resizable from the right edge (maximum width equals the dialog
  height); every point has its own box with a separate number badge, and every
  confirmation has a free-form Notes field.
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
- Open-source packaging: README, CI, contribution and security notes, and a
  manual test plan.
- Fixed manual regression checklist in `docs/MANUAL-REGRESSION.md`.
- Component browser E2E with Playwright-core and a local fixture in
  `test/e2e/` (`pnpm test:e2e`).

## 0.1.0 — 2026-11-16

- Initial local bundle: intent check, milestone confirmation, ledger, composer
  switch.
