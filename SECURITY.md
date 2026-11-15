# Security

## Reporting

Please report security issues privately to the maintainers rather than opening a
public issue with exploit details. If the repository has GitHub private
vulnerability reporting enabled, use that.

## Data handling

- No network calls, telemetry, analytics, or remote fonts.
- Decisions are written to `<session cwd>/.dsh-info-check/ledger.md`; a path that
  resolves outside the session directory is skipped.
- The user's choices also appear in the DSH session log as commands and tool
  results.
- The bundle does not read credentials or environment secrets.

## Threat model

This is a **UX gate**, not a security boundary:

- It can hide/deny tools per conversation through the policy and tool `when`
  checks, but it does not sandbox the agent or hard-block file writes.
- A user can disable it for a conversation; the agent can still act normally.
- The ledger is trusted Markdown; review it before sharing a workspace.

## Dependencies

The bundle declares no dependencies. The client half uses `react` and
`react-dom` from the DSH web client's module table; the Host half imports only
Node built-ins and its own `lib/pure.js`.

## Supported versions

Tested with DSH `0.2.2-rc.3`. `engines.dsh` narrows the supported family to
`0.2.x`.
