import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Room from '@/models/Room';
import SqlWorkspace from '@/models/SqlWorkspace';
import SqlQuery from '@/models/SqlQuery';
import { hasSqlAccess } from '@/lib/sql-access';
import { runSql } from '@/lib/sql-engine.cjs';
import rateLimit from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;
const limiter = rateLimit({ interval: 60000, uniqueTokenPerInterval: 500 });
const quote = (name: string) => '"' + name.replace(/"/g, '""') + '"';

async function access(request: NextRequest, roomId: string) {
  if (!/^[\w-]{1,128}$/.test(roomId)) return NextResponse.json({ error: 'Invalid room ID.' }, { status: 400 });
  try { await limiter.check(30, roomId); } catch { return NextResponse.json({ error: 'Too many SQL requests. Try again in a minute.' }, { status: 429 }); }
  await connectDB();
  const room = await Room.findOne({ roomId });
  if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });
  if (!hasSqlAccess(request, room)) return NextResponse.json({ error: 'Unlock this room with its password before accessing SQL data.' }, { status: 403 });
  return room;
}

export async function GET(request: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const room = await access(request, params.roomId);
    if (room instanceof NextResponse) return room;
    if (request.nextUrl.searchParams.get('history') === '1') {
      const page = Number(request.nextUrl.searchParams.get('page') || 0);
      if (!Number.isSafeInteger(page) || page < 0 || page > 100000) return NextResponse.json({ error: 'Invalid history page.' }, { status: 400 });
      const queries = await SqlQuery.find({ roomKey: room._id }).sort({ createdAt: -1, _id: -1 }).skip(page * 20).limit(21)
        .select('sql status error diagnostic executionTime databaseSaved revision createdAt').lean();
      return NextResponse.json({ queries: queries.slice(0, 20), hasMore: queries.length > 20, page });
    }
    const workspace = await SqlWorkspace.findOne({ roomKey: room._id });
    const table = request.nextUrl.searchParams.get('table');
    if (!table) return NextResponse.json({ schema: workspace?.schema || [], exists: !!workspace, revision: workspace?.revision || 0 });
    if (!workspace || !workspace.schema.some((entry: { name: string }) => entry.name === table)) return NextResponse.json({ error: 'Table not found. Refresh the database explorer.' }, { status: 404 });
    const rawPage = Number(request.nextUrl.searchParams.get('page') || 0);
    if (!Number.isSafeInteger(rawPage) || rawPage < 0 || rawPage > 100000) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 });
    const result = await runSql({ image: new Uint8Array(workspace.image), sql: `SELECT * FROM ${quote(table)} LIMIT 100 OFFSET ${rawPage * 100}`, readOnly: true });
    return NextResponse.json({ results: result.results, schema: result.schema, page: rawPage, saved: true, revision: workspace.revision, executionTime: 0 });
  } catch { return NextResponse.json({ error: 'Could not load SQL data. Check the database connection and try again.' }, { status: 503 }); }
}

export async function POST(request: NextRequest, { params }: { params: { roomId: string } }) {
  try {
    const origin = request.headers.get('origin');
    if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Cross-origin SQL requests are not allowed.' }, { status: 403 });
    const room = await access(request, params.roomId);
    if (room instanceof NextResponse) return room;
    if (Number(request.headers.get('content-length') || 0) > 70000) return NextResponse.json({ error: 'Query is too large.' }, { status: 413 });
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid query request.' }, { status: 400 }); }
    if (typeof body.sql !== 'string' || !body.sql.trim() || Buffer.byteLength(body.sql) > 64000) return NextResponse.json({ error: 'Enter SQL up to 64 KB.' }, { status: 400 });
    const workspace = await SqlWorkspace.findOne({ roomKey: room._id });
    const started = Date.now();
    // Save the exact submitted script before running, including scripts that later fail.
    const query = await SqlQuery.create({ roomId: params.roomId, roomKey: room._id, sql: body.sql });
    const finish = async (payload: Record<string, any>, status = 200) => {
      let historySaved = false;
      try {
        const updated = await SqlQuery.updateOne({ _id: query._id, roomKey: room._id }, { $set: {
          status: status >= 400 ? 'error' : 'success', error: payload.error || null,
          diagnostic: payload.diagnostic || null, executionTime: Date.now() - started,
          databaseSaved: payload.saved === true, revision: payload.revision ?? null,
        } });
        historySaved = updated.matchedCount === 1;
      } catch { /* The original script remains saved with an unconfirmed outcome. */ }
      return NextResponse.json({ ...payload, historySaved, ...(!historySaved ? { historyWarning: 'Your query text was saved, but its final status could not be recorded. Refresh Query history.' } : {}) }, { status });
    };
    let result;
    try {
      result = await runSql({ image: workspace ? new Uint8Array(workspace.image) : undefined, sql: body.sql, readOnly: !!room.isLocked || body.readOnly === true });
    } catch (error: any) { return finish({ error: error.message, diagnostic: error.diagnostic, rolledBack: true }, 422); }
    // Recheck access and room lock after execution, before publishing a new image.
    const currentRoom = await Room.findOne({ roomId: params.roomId });
    if (!currentRoom || String(currentRoom._id) !== String(room._id) || !hasSqlAccess(request, currentRoom) || (currentRoom.isLocked && !room.isLocked)) return finish({ error: 'Room access changed during execution. Run again after unlocking.' }, 409);
    let revision = workspace?.revision || 0;
    const readOnly = !!room.isLocked || body.readOnly === true;
    if (!readOnly) {
      try {
        if (workspace) {
          const saved = await SqlWorkspace.updateOne({ roomKey: room._id, revision }, { $set: { image: Buffer.from(result.image), schema: result.schema }, $inc: { revision: 1 } });
          if (!saved.modifiedCount) return finish({ error: 'Another query updated this database. Your changes were not saved. Run again.' }, 409);
        } else {
          // A deleted room's database must never be inherited by a new room with the same URL.
          await SqlWorkspace.deleteMany({ roomId: params.roomId, roomKey: { $ne: room._id } });
          await SqlWorkspace.create({ roomId: params.roomId, roomKey: room._id, image: Buffer.from(result.image), schema: result.schema, revision: 1 });
        }
        revision++;
      } catch (error: any) {
        return finish({ error: error.code === 11000 ? 'Another query created this database. Run again.' : 'MongoDB could not save your SQL database. Your changes were not saved.' }, error.code === 11000 ? 409 : 503);
      }
    }
    return finish({ results: result.results, schema: result.schema, revision, saved: !readOnly, executionTime: Date.now() - started });
  } catch { return NextResponse.json({ error: 'SQL storage is unavailable. Check the database connection and try again.' }, { status: 503 }); }
}
