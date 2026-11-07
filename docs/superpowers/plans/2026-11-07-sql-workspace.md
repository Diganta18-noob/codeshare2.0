# SQL Workspace Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Run SQLite scripts, persist room databases in MongoDB, and browse results and saved tables.
**Architecture:** Interruptible sql.js worker returns an atomic database image and structured result sets. Room-scoped APIs enforce access, persist with revision checks, and provide schema and paginated previews. React integrates SQL results and explorer tables into the current workspace.
**Tech Stack:** Next.js 14, sql.js, worker_threads, Mongoose, React.
**Spec:** docs/superpowers/specs/2026-11-07-sql-workspace-design.md

## Global constraints
No filesystem databases. Per-room isolation, signed password capability, locked-room read-only execution, no misleading save success, bounded execution and output. Preserve other runners.

## Review focus
Empty SELECT retains column headings; duplicate column labels retain separate values; failed scripts never persist; concurrent saves return conflicts; password changes invalidate access.

## Tasks
- [x] 1. Add engine tests in tests/sql-engine.test.cjs; observe missing engine failure. Implement lib/sql-engine.cjs with runSql({image,sql,readOnly}) and worker timeout, binary export, schema, 200-row result limit, 100 statements and 2MB database cap. Test joins, rollback, constraints, empty/duplicate/NULL results, forbidden commands and timeouts.
- [x] 2. Add models/SqlWorkspace.ts, lib/sql-access.ts and app/api/rooms/[roomId]/sql/route.ts. GET returns schema or a validated table preview; POST executes and conditionally persists by revision. Extend password verification to issue scoped cookie. Test capability and persistence/isolation/concurrency in integration tests.
- [x] 3. Add components/SqlResults.tsx and SqlExplorer.tsx. Pass room context to OutputPanel, route SQL separately, render grids, preview table on click, refresh schema after execution, retain error details and disable read-only execution controls. Style in styles/workspace.css.
- [x] 4. Run engine/integration tests, tsc, production build, and desktop/mobile browser verification. Obtain fresh review and fix findings. Document setup and limits. Do not push or deploy.

## Execution ledger
- User explicitly approved design and requested execution; proceeding inline without another approval gate.
- Work in existing workspace to preserve user's local preview and approved spec. No commit/push requested for this feature.

- Completed: 6 SQL engine tests and 5 MongoDB integration tests pass. TypeScript check and production build pass.
- Fresh review: separated/traced worker for production, hardened quoted-identifier scanning, bounded SQLite heap, added ObjectId room isolation/cascade delete, and fixed first-run/Monaco shortcut behavior. Regression tests pass.
- Production HTTP smoke: saved products table and four rows in MongoDB; browser verified Run, Ctrl+Enter, missing-table error, explorer preview with types, reload persistence, and 390px mobile grid.
- Local demo: http://localhost:3103/c/sql-demo-mw64kqum. Demo room intentionally retained; randomly named integration rooms removed by test cleanup.
- Source changes remain on codex/sql-workspace; no push or production deployment performed.
- Debugging follow-up: added structured SQLite diagnostics with statement-start line/column, original error, statement source, contextual suggestions, rollback confirmation and editor navigation. Added DROP/comment/multi-statement and API propagation regressions. Eight engine and six MongoDB integration tests pass; TypeScript/build pass. Browser verified the current missing-table error and Go to statement focusing line 2. User query preserved.
- Query-history follow-up: save every authorized submitted script before execution in SqlQuery, finalize its success/error outcome, expose paginated room-scoped history, and add query inspection/copy/open-as-new-file UI. Old queries cannot be backfilled; table previews are not logged. Added history pagination, failed-run, password and recreated-room isolation coverage. Eight engine and seven MongoDB integration tests pass.
