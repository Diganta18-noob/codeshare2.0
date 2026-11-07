import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const secret = () => process.env.JWT_SECRET || process.env.MONGODB_URI;
export const sqlCookieName = (roomId: string) => 'sql_room_' + crypto.createHash('sha256').update(roomId).digest('hex').slice(0, 16);
export function issueSqlAccess(roomId: string, passwordHash: string) {
  const key = secret();
  if (!key) throw new Error('Room access signing is unavailable');
  return jwt.sign({ roomId, fingerprint: crypto.createHash('sha256').update(passwordHash).digest('hex'), purpose: 'sql-room' }, key, { expiresIn: '2h', algorithm: 'HS256' });
}
export function hasSqlAccess(request: NextRequest, room: { roomId: string; passwordHash?: string | null }) {
  if (!room.passwordHash) return true;
  try {
    const key = secret();
    const token = request.cookies.get(sqlCookieName(room.roomId))?.value;
    if (!key || !token) return false;
    const payload = jwt.verify(token, key, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    return payload.purpose === 'sql-room' && payload.roomId === room.roomId && payload.fingerprint === crypto.createHash('sha256').update(room.passwordHash).digest('hex');
  } catch { return false; }
}
