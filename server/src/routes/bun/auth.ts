import { getDb } from '../../db/index.js';
import { jsonResponse, parseJson } from '../../lib/json.js';
import { authenticateRequest } from '../../lib/auth.js';
import crypto from 'crypto';

export async function authRoute(req: Request, url: URL): Promise<Response> {
  const path = url.pathname;

  // POST /api/auth/login
  if (path === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseJson(req);
      const { username, password } = body;

      if (!username || !password) {
        return jsonResponse({ error: { message: 'Username and password required' } }, 400);
      }

      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;

      if (!user) {
        return jsonResponse({ error: { message: 'Invalid credentials' } }, 401);
      }

      const derived = crypto.pbkdf2Sync(password, user.salt, 100000, 64, 'sha512').toString('hex');
      if (derived !== user.password_hash) {
        return jsonResponse({ error: { message: 'Invalid credentials' } }, 401);
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      db.prepare('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)').run(user.id, token, expiresAt);

      return jsonResponse({
        user: { id: user.id, username: user.username },
        token,
        expiresAt,
      });
    } catch (err: any) {
      return jsonResponse({ error: { message: err.message } }, 400);
    }
  }

  // GET /api/auth/me
  if (path === '/api/auth/me' && req.method === 'GET') {
    const auth = authenticateRequest(req);
    if (!auth.ok) return auth.response;
    return jsonResponse({ user: auth.user });
  }

  // POST /api/auth/logout
  if (path === '/api/auth/logout' && req.method === 'POST') {
    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        const db = getDb();
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
      }
    }
    return jsonResponse({ success: true });
  }

  // POST /api/auth/change-password
  if (path === '/api/auth/change-password' && req.method === 'POST') {
    const auth = authenticateRequest(req);
    if (!auth.ok) return auth.response;

    try {
      const body = await parseJson(req);
      const { currentPassword, newPassword } = body;

      if (!currentPassword || !newPassword) {
        return jsonResponse({ error: { message: 'Current password and new password required' } }, 400);
      }

      if (newPassword.length < 6) {
        return jsonResponse({ error: { message: 'New password must be at least 6 characters' } }, 400);
      }

      const db = getDb();
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(auth.user.id) as any;

      const derived = crypto.pbkdf2Sync(currentPassword, user.salt, 100000, 64, 'sha512').toString('hex');
      if (derived !== user.password_hash) {
        return jsonResponse({ error: { message: 'Current password is incorrect' } }, 401);
      }

      const newSalt = crypto.randomBytes(16).toString('hex');
      const newHash = crypto.pbkdf2Sync(newPassword, newSalt, 100000, 64, 'sha512').toString('hex');
      db.prepare('UPDATE users SET password_hash = ?, salt = ? WHERE id = ?').run(newHash, newSalt, auth.user.id);

      // Invalidate all other sessions
      const authHeader = req.headers.get('Authorization');
      const currentToken = authHeader!.slice(7).trim();
      db.prepare('DELETE FROM sessions WHERE user_id = ? AND token != ?').run(auth.user.id, currentToken);

      return jsonResponse({ success: true });
    } catch (err: any) {
      return jsonResponse({ error: { message: err.message } }, 400);
    }
  }

  return new Response('Not Found', { status: 404 });
}
