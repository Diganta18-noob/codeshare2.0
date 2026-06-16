import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest } from 'next/server';
import type { UserRole } from '@/models/User';

// ============================================================
// CONFIG
// ============================================================

const JWT_SECRET = process.env.JWT_SECRET || 'codeshare-dev-secret-change-in-prod';
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;

// ============================================================
// PASSWORD HASHING
// ============================================================

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================
// JWT TOKEN
// ============================================================

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// ============================================================
// REQUEST HELPERS
// ============================================================

/**
 * Extract the JWT token from an incoming request.
 * Checks: Authorization header (Bearer xxx), then cookie (token=xxx).
 */
export function extractToken(request: NextRequest): string | null {
  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // 2. Check cookies
  const cookieToken = request.cookies.get('token')?.value;
  if (cookieToken) {
    return cookieToken;
  }

  return null;
}

/**
 * Authenticate a request. Returns the decoded JWT payload or null.
 */
export function authenticateRequest(request: NextRequest): JWTPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Require admin role. Returns the payload if the user is an admin, null otherwise.
 */
export function requireAdmin(request: NextRequest): JWTPayload | null {
  const payload = authenticateRequest(request);
  if (!payload || payload.role !== 'admin') return null;
  return payload;
}

/**
 * Create a Set-Cookie header value for the JWT token.
 */
export function createTokenCookie(token: string): string {
  const maxAge = 7 * 24 * 60 * 60; // 7 days in seconds
  return `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${
    process.env.NODE_ENV === 'production' ? '; Secure' : ''
  }`;
}

/**
 * Create a Set-Cookie header value that clears the token cookie.
 */
export function clearTokenCookie(): string {
  return 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}
