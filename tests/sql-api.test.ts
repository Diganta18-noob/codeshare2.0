import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { NextRequest } from 'next/server';
import { POST, GET } from '../app/api/rooms/[roomId]/sql/route';
import { POST as verify } from '../app/api/rooms/[roomId]/verify/route';
import { connectDB } from '../lib/mongodb';
import Room from '../models/Room';
import SqlWorkspace from '../models/SqlWorkspace';
import SqlQuery from '../models/SqlQuery';

const prefix = 'sql-test-' + crypto.randomUUID();
const ids: string[] = [];
const params = (roomId: string) => ({ params: { roomId } });
const post = (id: string, sql: string, cookie?: string) => POST(new NextRequest(`http://localhost/api/rooms/${id}/sql`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ sql }) }), params(id));
const get = (id: string, query = '') => GET(new NextRequest(`http://localhost/api/rooms/${id}/sql${query}`), params(id));
async function room(suffix: string, fields = {}) {
  await connectDB();
  const roomId = `${prefix}-${suffix}`;
  ids.push(roomId);
  await Room.create({ roomId, ...fields });
  return roomId;
}
after(async () => {
  if (mongoose.connection.readyState === 1) {
    await SqlWorkspace.deleteMany({ roomId: { $in: ids } });
    await SqlQuery.deleteMany({ roomId: { $in: ids } });
    await Room.deleteMany({ roomId: { $in: ids } });
  }
  await mongoose.disconnect();
});

test('query history saves successful and failed runs and supports paginated, room-scoped access', async () => {
  const id = await room('query-history');
  const other = await room('query-history-other');
  assert.equal((await post(id, 'SELECT 42 AS answer;')).status, 200);
  assert.equal((await post(id, 'DROP')).status, 422);
  const response = await get(id, '?history=1&page=0');
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.queries.length, 2);
  assert.equal(data.queries[0].sql, 'DROP');
  assert.equal(data.queries[0].status, 'error');
  assert.match(data.queries[0].error, /incomplete input/);
  assert.equal(data.queries[0].diagnostic.line, 1);
  assert.equal(data.queries[1].sql, 'SELECT 42 AS answer;');
  assert.equal(data.queries[1].status, 'success');
  assert.ok(data.queries[1].createdAt);
  assert.equal(data.hasMore, false);
  assert.deepEqual((await (await get(other, '?history=1')).json()).queries, []);
  assert.equal((await get(id, '?history=1&page=-1')).status, 400);
  const owner = await Room.findOne({ roomId: id });
  await SqlQuery.insertMany(Array.from({ length: 21 }, (_, i) => ({ roomId: id, roomKey: owner._id, sql: `SELECT ${i};`, status: 'success' })));
  const firstPage = await (await get(id, '?history=1&page=0')).json();
  const secondPage = await (await get(id, '?history=1&page=1')).json();
  assert.equal(firstPage.queries.length, 20);
  assert.equal(firstPage.hasMore, true);
  assert.equal(secondPage.queries.length, 3);
  assert.equal(secondPage.hasMore, false);
  assert.equal(new Set([...firstPage.queries, ...secondPage.queries].map(q => q._id)).size, 23);
  await Room.deleteOne({ roomId: id });
  await Room.create({ roomId: id });
  assert.deepEqual((await (await get(id, '?history=1')).json()).queries, []);
});

test('SQL errors return debugger context through the API without saving a workspace', async () => {
  const id = await room('debug-errors');
  const response = await post(id, '-- saved tables\nDROP\n');
  assert.equal(response.status, 422);
  const data = await response.json();
  assert.equal(data.rolledBack, true);
  assert.equal(data.diagnostic.line, 2);
  assert.equal(data.diagnostic.message, 'incomplete input');
  assert.match(data.diagnostic.hint, /DROP TABLE table_name;/);
  assert.equal(await SqlWorkspace.countDocuments({ roomId: id }), 0);
});

test('room SQL survives MongoDB reload, previews pages, and isolates rooms', async () => {
  const a = await room('persist');
  const b = await room('other');
  let res = await post(a, "CREATE TABLE people(id INTEGER PRIMARY KEY, name TEXT); INSERT INTO people VALUES(1,'Ada'); SELECT * FROM people;");
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal((await res.json()).saved, true);
  const stored = await SqlWorkspace.findOne({ roomId: a }).lean() as any;
  assert.ok(stored.image.buffer.length > 0);
  res = await post(a, 'SELECT name FROM people;');
  assert.deepEqual((await res.json()).results[0].rows, [['Ada']]);
  const preview = await get(a, '?table=people&page=0');
  assert.deepEqual((await preview.json()).results[0].rows, [[1, 'Ada']]);
  assert.equal((await post(b, 'SELECT * FROM people;')).status, 422);
  assert.equal((await get(a, '?table=missing')).status, 404);
  assert.equal((await get(a, '?table=people&page=-1')).status, 400);
});
test('failed scripts leave MongoDB unchanged and concurrent writes reject conflicts', async () => {
  const id = await room('atomic');
  assert.equal((await post(id, 'CREATE TABLE t(id INTEGER UNIQUE); INSERT INTO t VALUES(1);')).status, 200);
  const before = await SqlWorkspace.findOne({ roomId: id });
  assert.equal((await post(id, 'INSERT INTO t VALUES(2); INSERT INTO t VALUES(1);')).status, 422);
  const afterFailure = await SqlWorkspace.findOne({ roomId: id });
  assert.equal(afterFailure.revision, before.revision);
  assert.deepEqual(afterFailure.image, before.image);
  const pair = await Promise.all([post(id, 'INSERT INTO t VALUES(3);'), post(id, 'INSERT INTO t VALUES(4);')]);
  assert.equal(pair.filter(r => r.status === 200).length, 1);
  assert.equal(pair.filter(r => r.status === 409).length, 1);
});
test('password capability is room-scoped and invalidates on password change; locks reject writes', async () => {
  const passwordHash = crypto.createHash('sha256').update('test-password').digest('hex');
  const id = await room('protected', { passwordHash });
  assert.equal((await post(id, 'SELECT 1')).status, 403);
  assert.equal((await get(id, '?history=1')).status, 403);
  const verified = await verify(new NextRequest(`http://localhost/api/rooms/${id}/verify`, { method: 'POST', body: JSON.stringify({ password: 'test-password' }) }), params(id));
  assert.equal(verified.status, 200);
  const cookie = verified.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await post(id, 'CREATE TABLE private_data(x);', cookie)).status, 200);
  const other = await room('protected-other', { passwordHash });
  assert.equal((await post(other, 'SELECT 1', cookie)).status, 403);
  await Room.updateOne({ roomId: id }, { $set: { isLocked: true } });
  assert.equal((await post(id, 'INSERT INTO private_data VALUES(1);', cookie)).status, 422);
  assert.equal((await post(id, 'SELECT * FROM private_data;', cookie)).status, 200);
  await Room.updateOne({ roomId: id }, { $set: { passwordHash: 'changed' } });
  assert.equal((await post(id, 'SELECT 1', cookie)).status, 403);
});
test('save failure is reported without successful query results', async () => {
  const id = await room('save-failure');
  const original = SqlWorkspace.create;
  SqlWorkspace.create = async () => { throw new Error('storage unavailable'); };
  try {
    const res = await post(id, 'CREATE TABLE t(x)');
    assert.equal(res.status, 503);
    const data = await res.json();
    assert.match(data.error, /not saved/);
    assert.equal(data.results, undefined);
  } finally { SqlWorkspace.create = original; }
});
test('recreated room IDs cannot access an earlier room database', async () => {
  const id = await room('recreated');
  assert.equal((await post(id, 'CREATE TABLE confidential(x); INSERT INTO confidential VALUES(1);')).status, 200);
  await Room.deleteOne({ roomId: id });
  await Room.create({ roomId: id });
  assert.equal((await get(id, '?table=confidential')).status, 404);
  assert.equal((await post(id, 'SELECT * FROM confidential;')).status, 422);
  assert.equal((await post(id, 'CREATE TABLE fresh(x);')).status, 200);
});
