const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runSql } = require('../lib/sql-engine.cjs');

test('incomplete DROP includes exact source location, native message and an actionable hint', async () => {
  await assert.rejects(runSql({ sql: '-- saved tables\nDROP\n' }), error => {
    assert.equal(error.diagnostic?.message, 'incomplete input');
    assert.equal(error.diagnostic.statement, 1);
    assert.equal(error.diagnostic.line, 2);
    assert.equal(error.diagnostic.column, 1);
    assert.equal(error.diagnostic.sql.trim(), 'DROP');
    assert.match(error.diagnostic.hint, /DROP TABLE table_name;/);
    assert.equal(error.diagnostic.locationKind, 'statement');
    return true;
  });
});
test('later statements retain source lines after comments and quoted semicolons', async () => {
  await assert.rejects(runSql({ sql: "SELECT 'semi;colon';\n/* context */\nSELECT * FROM missing_people;" }), error => {
    assert.equal(error.diagnostic?.statement, 2);
    assert.equal(error.diagnostic.line, 3);
    assert.match(error.diagnostic.message, /no such table: missing_people/);
    assert.equal(error.diagnostic.sql.trim(), 'SELECT * FROM missing_people;');
    assert.match(error.diagnostic.hint, /SQL Database/);
    return true;
  });
});

test('SQL persists tables and supports joins, NULL, empty results and duplicate labels', async () => {
  const a = await runSql({ sql: "CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT); INSERT INTO users VALUES (1,'Ada'),(2,NULL);" });
  assert.equal(a.schema[0].name, 'users');
  const b = await runSql({ image: a.image, sql: 'SELECT a.id, b.id, a.name FROM users a JOIN users b ON a.id=b.id ORDER BY a.id; SELECT name FROM users WHERE 0;' });
  assert.deepEqual(b.results[0].columns, ['id', 'id', 'name']);
  assert.deepEqual(b.results[0].rows, [[1, 1, 'Ada'], [2, 2, null]]);
  assert.deepEqual(b.results[1].columns, ['name']);
  assert.deepEqual(b.results[1].rows, []);
});
test('failed scripts report statement number and preserve original database', async () => {
  const a = await runSql({ sql: 'CREATE TABLE t(id INTEGER UNIQUE); INSERT INTO t VALUES(1);' });
  await assert.rejects(runSql({ image: a.image, sql: 'INSERT INTO t VALUES(2); INSERT INTO t VALUES(1);' }), /Statement 2.*UNIQUE/i);
  const b = await runSql({ image: a.image, sql: 'SELECT * FROM t;' });
  assert.deepEqual(b.results[0].rows, [[1]]);
});
test('readonly databases reject mutations and unsafe commands', async () => {
  await assert.rejects(runSql({ sql: 'CREATE TABLE t(id);', readOnly: true }), /readonly|read.only/i);
  for (const sql of ["ATTACH DATABASE ':memory:' AS other", 'PRAGMA query_only=OFF', 'BEGIN', "SELECT load_extension('x')"]) {
    await assert.rejects(runSql({ sql }), /not allowed|not authorized/i);
  }
  await assert.rejects(runSql({ sql: "SELECT '--'; PRAGMA query_only=OFF;", readOnly: true }), /not allowed/);
  const safe = await runSql({ sql: "SELECT 'text -- pragma attach', 'it''s /* a string */';" });
  assert.equal(safe.results[0].rows[0][0], 'text -- pragma attach');
  await assert.rejects(runSql({ sql: 'SELECT 1; SELEC 2;' }), /Statement 2/);
  for (const identifier of ['"--"', '"/*"', '`--`', '[--]']) {
    await assert.rejects(runSql({ sql: `SELECT 1 AS ${identifier}; PRAGMA query_only=OFF; CREATE TABLE secret(x);`, readOnly: true }), /not allowed/);
  }
});
test('results truncate without losing stored rows and scripts parse comments and strings', async () => {
  const a = await runSql({ sql: "-- hi\nCREATE TABLE t(x); INSERT INTO t VALUES('semi;colon'); WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n WHERE x<250) INSERT INTO t SELECT x FROM n; SELECT * FROM t;" });
  assert.equal(a.results.at(-1).rows.length, 200);
  assert.equal(a.results.at(-1).truncated, true);
  const b = await runSql({ image: a.image, sql: 'SELECT COUNT(*) FROM t;' });
  assert.deepEqual(b.results[0].rows, [[251]]);
});
test('errors and long running queries are bounded', async () => {
  await assert.rejects(runSql({ sql: 'SELEC 1;' }), /Statement 1.*syntax/i);
  await assert.rejects(runSql({ sql: 'SELECT randomblob(100000000);' }), /memory|limit/i);
  await assert.rejects(runSql({ sql: 'WITH RECURSIVE n(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM n) SELECT sum(x) FROM n;' }), /time limit/i);
});
test('updates, deletes, foreign keys and input/database limits are enforced', async () => {
  const a = await runSql({ sql: 'CREATE TABLE parent(id INTEGER PRIMARY KEY); CREATE TABLE child(id INTEGER REFERENCES parent(id)); INSERT INTO parent VALUES(1),(2); INSERT INTO child VALUES(1); UPDATE parent SET id=3 WHERE id=2; DELETE FROM parent WHERE id=3; SELECT * FROM parent;' });
  assert.deepEqual(a.results.at(-1).rows, [[1]]);
  assert.equal(a.results[4].affectedRows, 1);
  assert.equal(a.results[5].affectedRows, 1);
  await assert.rejects(runSql({ image: a.image, sql: 'INSERT INTO child VALUES(999);' }), /FOREIGN KEY/);
  await assert.rejects(runSql({ sql: 'x'.repeat(64001) }), /64 KB/);
  await assert.rejects(runSql({ sql: 'SELECT 1;'.repeat(101) }), /100 statements/);
  await assert.rejects(runSql({ sql: 'CREATE TABLE t(x); INSERT INTO t VALUES(zeroblob(2100000));' }), /full|2 MB|limit/i);
});
