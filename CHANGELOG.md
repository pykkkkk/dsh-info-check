# Changelog

All notable user-facing changes are documented here. DSH compatibility is
pinned by `engines.dsh`.

## Unreleased

- Task archive entries use a ten-digit task number (`YYMMDDHHmm`) at task start; each task is stored separately with its project contract, milestone budget, acceptance reports, budget reviews, delivery details, ledger timeline, and final settlement financial table. The archive has totals and search.

## 0.3.0 — 2026-11-20

### Added

- Engineering-contract workflow: the user is the client and the agent is the
  contractor.
- Task book with goal, quality bar, scope boundaries, and milestones.
- Budget plan card immediately after the task book: one editable total budget
  plus an editable budget for every milestone, with fixed `m1`/`m2` labels,
  content-only milestone inputs, direct numeric editing, and inline validation
  that the milestone sum cannot exceed the total. The remainder is shown as
  reserve budget.
- Budget usage uses a line-by-line text/data grid and shows the milestone's
  initial budget directly above cumulative spend; adding budget is a choice
  inside the card, with the amount input shown only when selected.
- Budget settlement is a financial-report table.
- Budget amounts are CNY; actual usage comes from
  `@kenz1117/dsh-ui-usage-billing` when installed, otherwise from a token-usage
  estimate read from the session log.
- Two-round budget confirmation: the user confirms the first plan, the agent
  rethinks and explains adjustments, then the user confirms the signed plan.
- Budget sign-off: quote, breakdown, assumptions, risks, negotiation, and a
  signed initial budget before execution.
- Milestone budget review: cumulative spend, remaining budget, extra requests,
  approval/denial, and pause.
- Final budget settlement with a client rating.
- Learned budget standard, injected into later task instructions.
- Complete workflow flowchart in `docs/FLOW.md`.

### Changed

- Acceptance and budget review are separate gates: accept a milestone, then
  review its budget before the next milestone.
- Milestones and their budget are locked to the confirmed plan.

## 0.2.2 — 2026-11-18

### Added

- Task progress bar above the message box: one line-drawn stone tablet per
  milestone, per-conversation state, hover titles, reset/dismiss, and hiding
  after delivery.
- Task retrospectives written to one local file, with a short summary returned
  at delivery.
- A maintained user quality standard, regenerated from completed reviews and
  injected into later tasks.
- A free-form quality-standard input in Settings, saved into
  `.dsh-info-check/quality-standard.md`.
- File-location links in Settings for the ledger, retrospective, and quality
  standard.
- Offline installation self-check and a smaller install smoke test.
- Supervision mode: strict checks or advisory.

### Changed

- A confirmed milestone plan stays fixed for the rest of the task.
- Acceptance must reference a newly changed deliverable; finished work cannot
  be batch-accepted as later milestones.
- Milestone acceptance no longer interrupts the conversation.

### Fixed

- Historical sessions no longer fail to load when progress projection data is
  malformed.
- Settings file-location actions now open reliably.
- Progress and retrospective counts stay consistent after edits, retries, and
  reloads.

### Future

- Broader visual regression coverage.
- More cross-platform checks.
- Optional task-list integration for teams that already track work there.

## 0.2.1 — 2026-11-16

- Detail questions: option toggles, free-form “Other” input, and auto-growing
  answer boxes.
- Milestone acceptance: pause task and result-file links.
- Milestone confirmation shows the milestone id and title.
- Top-right X means skip, not cancel.
