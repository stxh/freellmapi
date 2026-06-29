import { getDb } from '../db/index.js';
import { jsonResponse } from './json.js';

export interface AuthUser {
  id: number;
  username: string;
}

type AuthSuccess = { ok: true; user: AuthUser };
type AuthFailure = { ok: false; response: Response };
export type AuthResult = AuthSuccess | AuthFailure;

export function authenticateRequest(req: Request): AuthResult {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, response: jsonResponse({ error: { message: 'Authentication required' } }, 401) };
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, response: jsonResponse({ error: { message: 'Authentication required' } }, 401) };
  }

  const db = getDb();
  const session = db.prepare(`
    SELECT s.user_id, u.username FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) as { user_id: number; username: string } | undefined;

  if (!session) {
    return { ok: false, response: jsonResponse({ error: { message: 'Invalid or expired session' } }, 401) };
  }

  return { ok: true, user: { id: session.user_id, username: session.username } };
}
