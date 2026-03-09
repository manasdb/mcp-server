# Changelog

All notable changes to `@manasdb/mcp-server` will be documented in this file.

## [0.1.1] - 2026-03-09

### Added

- `src/cli.ts` router — `npx @manasdb/mcp-server` and `npx @manasdb/mcp-server setup` now work out of the box
- `CHANGELOG.md` — comprehensive version history
- `src/types.ts` — public exported TypeScript interfaces (`ManasDBMCPConfig`, `RecallResult`, `DatabaseConfig`, `ModelConfig`)
- `src/manasdb-core.d.ts` — ambient declaration for `@manasdb/core` to fix TypeScript build
- `tests/basic.test.mjs` — 6 automated unit tests covering config parsing and recall formatting (`npm test`)

### Changed

- `memorize` tool — response now surfaces the `contentId` of the stored memory so the AI can reference it for deletion
- `recall` tool — results now display a clearly formatted block per entry with `contentId`, `score`, `database`, and `text`, plus a hint to use `forget` with the `contentId`
- `forget` tool — now properly calls `manasdb.delete(contentId)` with a dedicated `contentId` input instead of a raw query string
- `package.json` — moved `mongodb` and `pg` to `optionalDependencies`; added `keywords`, `author`, `license`, `repository`, `engines`, `publishConfig`, and `files` fields

## [0.1.0] - 2026-03-09

### Added

- Initial release of `@manasdb/mcp-server`
- `memorize` tool: Stores text into ManasDB polyglot storage via `absorb()`. Returns `contentId` for future reference.
- `recall` tool: Semantically searches ManasDB and returns deduplicated results across all configured providers. Each result clearly surfaces its `contentId`, score, database source, and text.
- `forget` tool: Permanently deletes a memory from all databases using its `contentId` via `manasdb.delete()`.
- `--manas-config` CLI flag: Pass the full ManasDB configuration JSON directly as a command-line argument (no `.env` file required).
- `MANAS_DB_CONFIG` environment variable fallback for configuration.
- Full `ManasDB` config object support: `databases`, `projectName`, `modelConfig`, `telemetry`, `debug`.
- Interactive setup wizard (`npm run setup` / `npx @manasdb/mcp-server setup`) with database and embedding model prompts.
- Dynamic `indexPath` output in setup wizard — no hardcoded paths.
- `stdout` guard: All `console.log` calls are redirected to `stderr` to prevent breaking MCP JSON-RPC protocol.
- `cli.ts` router: Enables `npx @manasdb/mcp-server` and `npx @manasdb/mcp-server setup`.
- `StdioServerTransport` for compatibility with Claude Desktop and Cursor.
- Self-healing error handling: Logs errors per provider but continues serving results from healthy databases.
