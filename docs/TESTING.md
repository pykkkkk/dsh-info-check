# Testing

The fixed release regression pass lives in
[MANUAL-REGRESSION.md](MANUAL-REGRESSION.md). Use it before tagging a release;
keep this file for the automated checks and exploratory notes.

## Automated

```sh
npm run check   # syntax: Host, client, pure helpers
npm test        # pure logic + client smoke
```

CI runs these on Node 20, 22, and 24. The tests do not need DSH; they cover
validation, outcomes, ledger formatting, the composer-chain selector, and the
toggle/panel registrations.

## Manual checklist

Prerequisites:

- DSH `0.2.2-rc.3`, Desktop profile.
- The bundle installed and enabled in **Plugins**.
- The page refreshed after installation.
- A scratch workspace; the ledger will be created at
  `<workspace>/.dsh-info-check/ledger.md`.

### 1. Header switch

- The **需求核对** switch appears next to the **创造模式** chip:
  - new-session row: right of the preset control;
  - inside a session: right of the preset label in the header.
- The words are underlined; there is no box or pill background.
- Clicking the words opens the centered **Settings** window.
- Toggle it off in conversation A and on in conversation B; A and B stay
  independent.
- `/dsh-info-check status` reports the current conversation's state.

### 2. Settings

- Click the underlined **需求核对** words next to the switch.
- The Settings window shows **当前对话**, **偏好**, **自动计时**, and
  **核对与台账**.
- Change milestones to 2, expectation to 完美, timeout to 30, detail questions
  to 4, and turn the ledger off; click **保存设置**.
- Close and reopen: the values persist (global Config); the current
  conversation switch is separate.
- Start the next task: the policy should say 2 milestones / 完美, and the timed
  dialogs should count down from about 30 seconds.
- Save ledger path changes; the next ledger write uses the new path.
- If the plugin is off for this conversation, the Settings switch turns it on
  without leaving the window.
- If Settings cannot load, check that the plugin Config schema exists and the
  DSH version matches.

### 3. Intent check

- Send a non-trivial task, e.g. “Add a visually consistent button to the login
  page”.
- A centered `dsh-info-check` dialog appears.
- The report is split into `我的理解 / 完成标准 / 范围外 / 里程碑`, each with its
  own editable text box; headings are larger and pure black.
- Every point is a separate box with its own number badge; each confirmation
  ends with a Notes field.
- Drag the right edge: width changes; it cannot exceed the dialog height;
  double-click the edge restores the default width.
- Edit a section, check “我已确认以上理解”, continue.
- Answer the detail choices; the agent starts only after submission.
- The ledger receives an intent-check entry, including the edited brief.

### 4. Plan confirmation (once)

- After the intent check, a `里程碑确认` dialog appears **once**.
- The plan is split into `方案 / 影响范围`; the text is editable.
- `停止计时` stops the countdown and keeps the dialog open.
- After approval, later milestones should **not** show this dialog again.

### 5. Milestone acceptance

- When a milestone finishes, an `里程碑验收` dialog appears.
- The report (`里程碑 / 完成内容 / 验证证据 / 未完成或风险`) is read-only.
- `停止计时` freezes the countdown.
- `验收通过` continues; `需要返工` opens a second `返修说明` dialog with a text
  area. Submit a reason and confirm the model receives it and revises, then
  re-runs acceptance.

### 6. Delivery confirmation

- Before the final result, a `交付确认` dialog appears.
- The report (`完成程度 / 交付内容 / 未完成或限制 / 验证`) is read-only.
- `需要调整` opens a `调整说明` dialog; the reason goes back to the model.
- The final result is delivered only after `确认并交付` (or timeout/skip).

### 7. Timers

- With no interaction, the three timed dialogs auto-continue after the
  configured timeout (default 60 seconds).
- Focusing/editing pauses the countdown; `停止计时` stops it permanently.
- Opening a reason dialog stops the countdown.

### 8. Ledger

- `.dsh-info-check/ledger.md` is created under the session working directory.
- It records each gate's report, the user's decision, edited plans, and rework
  notes.
- It is not written when `ledgerEnabled: false`.
- A ledger path outside the session directory is skipped.

## Known limitations

- Root sessions only; subagents cannot ask the user.
- Each per-conversation toggle leaves one `/dsh-info-check` command line in the
  transcript.
- The dialogs use the DeepSeek Blue light palette; dark-mode adaptation is not
  included.
- The panel relies on `react-dom` `createPortal`; without it the dialog falls
  back to an in-composer card.
