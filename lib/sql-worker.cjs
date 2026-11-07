async function sqlWorker() {
  const { parentPort, workerData } = require('node:worker_threads');
  let db;
  let statementNumber = 0;
  let statementOffset = 0;
  let statementSql = workerData.sql;
  try {
    const init = require(workerData.modulePath);
    const SQL = await init({ locateFile: () => workerData.wasmPath });
    db = workerData.image?.length ? new SQL.Database(workerData.image) : new SQL.Database();
    db.run('PRAGMA hard_heap_limit=33554432; PRAGMA foreign_keys=ON; PRAGMA max_page_count=512;');
    if (workerData.readOnly) db.run('PRAGMA query_only=ON;');
    db.run('BEGIN');
    const results = [];
    let outputBytes = 0;
    // Reject privileged keywords outside comments and literals. SQL parsing remains SQLite's job.
    let stripped = '';
    const source = workerData.sql;
    for (let i = 0; i < source.length;) {
      if (source[i] === "'") {
        i++;
        while (i < source.length) {
          if (source[i++] === "'") { if (source[i] === "'") i++; else break; }
        }
        stripped += ' ';
      } else if (source[i] === '"' || source[i] === '`' || source[i] === '[') {
        const close = source[i] === '[' ? ']' : source[i];
        i++; stripped += ' ';
        while (i < source.length) {
          const char = source[i++];
          if (char === close) { if (source[i] === close && close !== ']') i++; else break; }
          stripped += /[\w]/.test(char) ? char : ' ';
        }
        stripped += ' ';
      } else if (source.slice(i, i + 2) === '--') {
        while (i < source.length && source[i] !== '\n') i++;
        stripped += ' ';
      } else if (source.slice(i, i + 2) === '/*') {
        i += 2;
        while (i < source.length && source.slice(i, i + 2) !== '*/') i++;
        i += 2; stripped += ' ';
      } else stripped += source[i++];
    }
    if (/\b(?:attach|detach|pragma|vacuum|load_extension|begin|commit|rollback|savepoint|release)\b/i.test(stripped)) {
      throw new Error('Database administration, transactions, attachments and extensions are not allowed.');
    }
    const statements = db.iterateStatements(workerData.sql);
    for (;;) {
      statementNumber++;
      statementSql = statements.getRemainingSQL();
      statementOffset = workerData.sql.length - statementSql.length;
      const next = statements.next();
      if (next.done) { statementNumber--; break; }
      const statement = next.value;
      statementSql = statement.getSQL();
      if (statementNumber > 100) throw new Error('A script may contain at most 100 statements.');
      const columns = statement.getColumnNames();
      const rows = [];
      let truncated = false;
      const before = db.exec('SELECT total_changes()')[0].values[0][0];
      while (statement.step()) {
        const row = statement.get().map(value => value instanceof Uint8Array ? `0x${Buffer.from(value).toString('hex')}` : value);
        const bytes = Buffer.byteLength(JSON.stringify(row));
        if (bytes > 64000) throw new Error('A result cell or row exceeds the 64 KB display limit.');
        if (rows.length >= 200 || outputBytes + bytes > 512000) { truncated = true; break; }
        rows.push(row);
        outputBytes += bytes;
      }
      const after = db.exec('SELECT total_changes()')[0].values[0][0];
      results.push({ statement: statementNumber, columns, rows, affectedRows: after - before, truncated });
      if (results.length > 100) throw new Error('Too many result sets.');
    }
    if (!results.length) throw new Error('Enter at least one SQL statement.');
    db.run('COMMIT');
    const tables = db.exec("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
    const quote = name => '"' + name.replace(/"/g, '""') + '"';
    const schema = (tables[0]?.values || []).map(([name]) => {
      const info = db.exec(`PRAGMA table_info(${quote(name)})`)[0];
      const count = db.exec(`SELECT count(*) FROM ${quote(name)}`)[0].values[0][0];
      return { name, rowCount: count, columns: info.values.map(row => ({ name: row[1], type: row[2] || 'ANY', primaryKey: Boolean(row[5]), nullable: !row[3] })) };
    });
    const image = db.export();
    if (image.length > 2 * 1024 * 1024) throw new Error('The room database exceeds the 2 MB limit.');
    parentPort.postMessage({ image, results, schema });
  } catch (error) {
    // Parsing the next statement can fail before iterateStatements yields it.
    const index = statementNumber || 1;
    const diagnostic = describeSqlError(error.message, workerData.sql, statementSql, statementOffset, index);
    parentPort.postMessage({ error: `Statement ${index}: ${error.message}`, diagnostic });
  } finally { db?.close(); }
}

function describeSqlError(message, source, sql, offset, statement) {
  // SQLite identifies the failing statement; it does not expose an error-token offset here.
  // Label this as the statement start rather than inventing an exact error position.
  const prefix = sql.match(/^(?:\s+|--[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/|;)+/)?.[0].length || 0;
  offset += prefix;
  sql = sql.slice(prefix);
  // Keep only the failing statement, respecting quoted semicolons and comments.
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    if (quote) {
      if (char === quote) { if (sql[i + 1] === quote && quote !== ']') i++; else quote = null; }
    } else if (char === "'" || char === '"' || char === '`' || char === '[') quote = char === '[' ? ']' : char;
    else if (sql.slice(i, i + 2) === '--') { while (i < sql.length && sql[i] !== '\n') i++; }
    else if (sql.slice(i, i + 2) === '/*') { i += 2; while (i < sql.length && sql.slice(i, i + 2) !== '*/') i++; i++; }
    else if (char === ';') { sql = sql.slice(0, i + 1); break; }
  }
  const before = source.slice(0, offset);
  const line = before.split('\n').length;
  const column = offset - before.lastIndexOf('\n');
  let title = 'SQL execution error';
  let hint = 'Check the highlighted statement and SQLite message. This runner uses SQLite syntax.';
  let example;
  if (/incomplete input/i.test(message)) {
    title = 'Incomplete SQL statement';
    hint = 'Complete the statement. Check for missing names, values, closing parentheses, or unfinished clauses.';
    if (/^DROP\b/i.test(sql)) {
      hint = 'DROP needs an object type and a name. To remove a table, use DROP TABLE table_name;. Replace table_name with a table shown in SQL Database.';
      example = 'DROP TABLE table_name;';
    } else if (/^SELECT\b/i.test(sql)) { hint = 'Specify the columns or expression to select, and complete any FROM or WHERE clause.'; example = 'SELECT * FROM table_name;'; }
    else if (/^INSERT\b/i.test(sql)) { hint = 'Specify the target table, columns, and values.'; example = 'INSERT INTO table_name (column_name) VALUES (value);'; }
    else if (/^CREATE\b/i.test(sql)) { hint = 'Complete the object definition, including its name, columns, and closing parenthesis.'; example = 'CREATE TABLE table_name (id INTEGER PRIMARY KEY);'; }
  } else if (/syntax error|unrecognized token/i.test(message)) {
    title = 'SQL syntax error'; hint = 'Check the token named in SQLite’s message, commas, parentheses, and keyword spelling. Use single quotes for text values.';
  } else if (/no such table/i.test(message)) {
    title = 'Table not found'; hint = 'Check the table name in SQL Database. Tables belong to this room; create the table here before querying it.';
  } else if (/no such column|has no column named/i.test(message)) {
    title = 'Column not found'; hint = 'Open the table in SQL Database to check its column names. Use single quotes for text values, and check any table aliases.';
  } else if (/UNIQUE constraint|PRIMARY KEY/i.test(message)) {
    title = 'Duplicate value'; hint = 'A value already exists in a unique or primary-key column. Choose a different value or update the existing row.';
  } else if (/NOT NULL/i.test(message)) {
    title = 'Required value missing'; hint = 'Supply a non-NULL value for the column named in the SQLite message.';
  } else if (/FOREIGN KEY/i.test(message)) {
    title = 'Foreign key constraint failed'; hint = 'Ensure the referenced parent row exists. A referenced row may also prevent an UPDATE or DELETE.';
  } else if (/constraint failed/i.test(message)) {
    title = 'Table constraint failed'; hint = 'Check the table definition and the values being inserted or updated.';
  } else if (/already exists/i.test(message)) {
    title = 'Object already exists'; hint = 'Use a different name, reuse the existing table, or use CREATE TABLE IF NOT EXISTS when appropriate.';
  } else if (/readonly|read.only/i.test(message)) {
    title = 'Database is read-only'; hint = 'This room or view is read-only. Run a SELECT query, or unlock the room before changing its tables.';
  } else if (/not allowed/i.test(message)) {
    title = 'Command unavailable'; hint = 'Use regular table and query statements. This runner manages transactions and blocks database administration and filesystem access.';
  } else if (/memory|full|limit|exceeds/i.test(message)) {
    title = 'SQL resource limit reached'; hint = 'Reduce the query or data size. Use LIMIT for previews; the saved room database is limited to 2 MB.';
  }
  return { title, message, statement, line, column, sql: sql.trimEnd(), hint, example, locationKind: 'statement' };
}

sqlWorker();
