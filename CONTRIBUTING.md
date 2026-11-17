# Contributing

Thanks for taking a look. This bundle is intentionally small and
dependency-free; changes should stay easy to audit and portable across DSH
releases.

## Development

No install step is required (no dependencies):

```sh
npm run check   # node --check index.js client.js lib/pure.js
npm test        # pure logic + client smoke tests
```

CI runs both on Node 20, 22, and 24. The tests do not require DSH; the client
smoke test stubs the module loader and React.

## Compatibility

- Tested against DSH `0.2.2-rc.3` (`engines.dsh` in `package.json`).
- Host code imports only Node built-ins and `lib/pure.js`. Do not import from a
  DSH installation path or add a schema loader: the bundle should stay
  dependency-free and installable from a linked directory.
- Client code depends on DSH-specific slots and services:
  - `conversation.composer`
  - `conversation.hero.options`
  - `conversation.session.header.actions`
  - `useProjection('infoCheck')`
  - `remote.commands.execute`
  - `react-dom` `createPortal`
- When DSH changes a slot shape, update this bundle and the tested version in
  `engines.dsh` / this file together.
- The `infoCheck` session projection uses a minimal `{ parse }` schema to stay
  dependency-free. If a DSH release requires a real schema type, add it and
  update the tests/README.

## Code conventions

- ESM, two-space indent, single quotes, no semicolon policy change (match the
  existing files).
- Pure validation/formatting lives in `lib/pure.js`; keep it free of Cordis and
  Node APIs so it stays unit-testable.
- Host tools must validate their own arguments and should return an explicit
  outcome (`decision`/`proceed`/`feedback`).
- The ledger is append-only Markdown. Do not add a new session event type; use
  the existing command/tool events.
- UI copy belongs in `client.js` locale dictionaries and `locale/*.json`
  metadata. Keep Chinese and English in sync.

## Renaming or publishing

The package is prepared as the unscoped npm name `dsh-info-check` and is no
longer private. To publish:

1. Keep `package.json` `name`, `client.js` loader id, and `cordis.patch.yml`
   row name identical (`dsh-info-check`).
2. Update profile references from `@local/dsh-info-check` to `dsh-info-check`.
3. Run `npm pack --dry-run`, then `npm publish --access public` from a normal
   shell after `npm login`.

## Pull requests

- Keep the change scoped; include the reason and the user-visible effect.
- Add or update a test when behavior changes (pure logic is easiest).
- Run `npm run check` and `npm test`.
- Note any DSH version or slot API that the change depends on.
- Do not commit a real `.dsh-info-check/ledger.md`, session IDs, local absolute
  paths, or credentials.
