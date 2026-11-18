# Changelog

All notable user-facing changes are documented here. DSH compatibility is
pinned by `engines.dsh`.

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
