<h1><img src="icon.svg" alt="dsh-info-check icon" width="36" height="36" align="middle" /> dsh-info-check</h1>

[![Version](https://img.shields.io/badge/version-0.2.2-4D6BFE?style=flat-square&labelColor=1F1F1F)](https://github.com/pykkkkk/dsh-info-check/releases)
[![DSH](https://img.shields.io/badge/DSH-0.2.2--rc.3-4D6BFE?style=flat-square&labelColor=1F1F1F)](https://github.com/deepseek-ai/deepseek-harness)
[![License](https://img.shields.io/badge/license-MIT-4D6BFE?style=flat-square&labelColor=1F1F1F)](LICENSE)

![dsh-info-check](docs/social-preview.png)

English | [中文](README.md)

Agents often start executing immediately. Misunderstandings then surface only at delivery, when rework is most expensive.

dsh-info-check adds four confirmation points to the workflow, so you can review the report at each key step before deciding whether to continue.

## Task progress

A progress bar appears just above the message box. Each milestone is a line-drawn stone tablet: progress moves forward faster, stops near the next tablet while it waits for acceptance, reaches the tablet when you accept, and finishes at the end after delivery, then hides. It reappears when the next task confirms its plan.

Hover a tablet to see the milestone title. Progress is saved per conversation and survives switching, refreshing, or restoring the session. The milestone list is locked after plan confirmation and cannot grow or shrink before the task ends. When the task is over, use the × on the progress bar or run `/dsh-info-check reset` to clear it.

## Screenshots

| Intent check | Plan confirmation |
|---|---|
| [![Intent check](docs/screenshots/01-intent-check.png)](docs/screenshots/01-intent-check.png) | [![Plan confirmation](docs/screenshots/02-plan-confirmation.png)](docs/screenshots/02-plan-confirmation.png) |
| **Milestone acceptance** | **Delivery confirmation** |
| [![Milestone acceptance](docs/screenshots/03-milestone-acceptance.png)](docs/screenshots/03-milestone-acceptance.png) | [![Delivery confirmation](docs/screenshots/04-delivery-confirmation.png)](docs/screenshots/04-delivery-confirmation.png) |

**Settings**

[![Settings](docs/screenshots/07-settings.png)](docs/screenshots/07-settings.png)

## Install

Install it from the **Plugins** page in DSH:

```text
dsh-info-check
```

Or use npm:

```sh
npm install dsh-info-check@0.2.2
```

Refresh the page after installing. A small underlined **需求核对** switch will appear next to the agent preset.

Built for DSH `0.2.x`; currently tested with `0.2.2-rc.3`.

## Check after install

From the plugin install directory, run:

```sh
node scripts/minimal-test.mjs
```

It checks package.json, entry files, the bundle, and the client loader id in a few seconds. For the fuller offline check:

```sh
node scripts/self-check.mjs
```

## What it adds

### A moment to align on the goal

Before substantive work, the agent restates what it understands, asks a few questions that actually affect the result, and lists the quality bar, out-of-scope items, and milestones.

You can edit that checklist directly and add your own requirements.

### One plan confirmation

Once the goal is clear, the agent proposes a plan. You confirm it once, so the work does not keep stopping for the same decision.

The milestone section shows which step you are on and what it covers.

### Acceptance after every milestone

After each milestone, the agent reports what was completed, how it was verified, and what is still open.

The report is read-only. You can:

- **Accept** and move to the next milestone;
- **Request rework**, add a reason, and let the agent revise it;
- **Pause the task**, so the agent summarizes the current progress and stops.

### A final sign-off before delivery

Before the final result, the agent explains how complete it is, what it delivers, what is limited, and how it was verified. Nothing is delivered until you confirm.

## Working with the cards

- Every point has its own box and number; long text makes the box grow.
- Every confirmation ends with a free-form **Notes** field.
- Drag the right edge to widen a dialog; double-click to reset it.
- The three timed cards have a countdown and a **Stop timer** button.
- Options can be clicked again to clear them, and each question has an **Other** field for your own answer.
- Acceptance reports can list result files; click a path to open its location.
- The top-right **X** means skip: continue with the agent's version without interrupting the task.

## Switch and settings

The **需求核对** switch next to the title only affects the current conversation.

Click the underlined words to open settings, where you can change:

- the number of milestones;
- the expectation level: perfect, good, or pass;
- the auto-skip timeout;
- how many detail questions the agent asks;
- whether new conversations start with the plugin on;
- whether to keep a ledger, and where to put it;
- whether retrospectives run automatically;
- supervision mode: strict checks or advisory;
- quality standard: enter your own requirements, saved into `.dsh-info-check/quality-standard.md`;
- file locations: open the ledger, retrospective, or quality standard directly.

Changes take effect immediately; no restart is needed.

Useful commands:

```text
/dsh-info-check on
/dsh-info-check off
/dsh-info-check status
/dsh-info-check retrospective
/dsh-info-check quality
/dsh-info-check quality rebuild
```

## Retrospectives and quality standard

After each confirmed delivery, the plugin summarizes the task's acceptance results, rework and adjustment reasons, and your notes into one retrospective file: `.dsh-info-check/retrospectives.md`, and returns a short retrospective summary with the delivery. Acceptance events are persisted so a plugin reload does not lose the current task's review.

Retrospectives run automatically by default. If you turn off **Auto retrospective** in settings, the plugin asks whether to add the task to the retrospective when you confirm delivery.

Every three completed tasks, the plugin updates `.dsh-info-check/quality-standard.md` from the accumulated retrospectives. That standard is included in later task instructions so the agent can follow your acceptance habits more closely. The manual section is preserved, and the standard is length-limited.

Retrospectives and the quality standard stay in the current workspace; nothing is uploaded or sent over the network.

## Privacy

- No network calls, telemetry, analytics, or remote fonts.
- Your choices are written to `.dsh-info-check/ledger.md` in the current session directory; retrospectives and the quality standard stay in the current workspace too.
- Retrospectives include your feedback and notes, but only for later local tasks; nothing is uploaded.
- It is a tool for keeping the process visible, not a security boundary; turning it off or skipping a card does not forcibly block the agent.

## License

MIT. Copyright (c) 2026 pykkkkk (Wenhao Liu). See [LICENSE](LICENSE).
