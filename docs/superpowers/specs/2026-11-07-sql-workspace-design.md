# Persistent SQL workspace

## Requested outcome
Run SQL from the existing editor, display query results as tables and useful SQL errors, and persist tables in the existing MongoDB database. Automatically show a separate folder for SQL data.

## Proposed behavior
- Selecting SQL and pressing Run executes SQLite SQL against this room's database. Support CREATE TABLE, INSERT, SELECT, UPDATE, DELETE, joins, aggregates, and multiple statements.
- The first successful run creates a persistent database workspace for that room. Later runs reuse its tables and rows; refreshing the browser or restarting the server preserves them.
- An expandable `SQL Database` folder in the explorer lists saved tables. Clicking a table opens a paginated data preview with column names and types.
- The output panel displays a result grid for every statement returning columns, including empty results. Other statements display affected row counts. Show elapsed time, NULL values, and clear loading, empty, saved, and error states.
- Invalid SQL displays the database error and failing statement number. Execute each submitted script atomically: any error rolls back that script. A failed MongoDB save must never display a success or saved status.

## Implementation choices (proposed by the builder)
- SQLite is the SQL dialect; MongoDB remains the persistence layer. Use an isolated SQLite database image per room, stored as MongoDB binary with schema metadata. MongoDB does not execute SQL itself.
- `SQL Database` is a virtual explorer folder, not a server filesystem directory. This supports Vercel's ephemeral filesystem and avoids creating a MongoDB collection for every user table.
- The room is the isolation boundary, matching existing shared editing. Collaborators in the same room share its SQL data; separate rooms cannot access each other's tables.
- Add dedicated room-scoped SQL execution, schema, and preview endpoints; keep other language runners intact.
- Use revision-based conditional saves to reject competing writes rather than silently losing table data. Return a retry message on conflict.
- Put resource limits on query length, database size, returned rows, and runtime; use an interruptible execution worker. Reject filesystem access, external attachments, and extension loading.
- Honor room password access on the new endpoints and disallow SQL mutations in locked/read-only contexts. Do not trust a client-supplied read-only flag as authorization.
- Extend successful password verification to issue a signed, room-scoped HttpOnly access cookie with a short expiry and a password-version fingerprint; changing the password invalidates it. Require this capability for protected SQL reads and writes. Locked rooms allow authorized previews and read-only SELECT execution, but reject mutations for everyone until unlocked. Public room URLs remain shared access, consistent with existing room behavior; a read-only page URL alone is not a separate server identity.
- Do not expose connection strings or MongoDB records through query errors. Report database connectivity failures separately from SQL syntax errors.

## Validation
Exercise create/insert/select, joins, empty SELECT, NULL and duplicate column labels, multiple result sets, script rollback, constraints, malformed SQL, oversized/long-running queries, room isolation, denied access, concurrent writes, MongoDB save failures, and reload persistence. Run TypeScript checking and production build; review desktop/mobile grids and explorer interaction.

## Deployment
Use the existing MONGODB_URI server environment variable. Verify local availability without printing its value. If it is unavailable, implement and test using an isolated test MongoDB and report that a real configured MongoDB connection is still required for end-to-end verification. Do not change production data or push/deploy without an applicable user instruction.
