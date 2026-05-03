import { getUnifiedApiKey, regenerateUnifiedKey } from '../../db/index.js';
import { jsonResponse, errorResponse } from '../../lib/json.js';
import { z } from 'zod';

export async function settingsRoute(req: Request, _url: URL): Promise<Response> {
  const path = new URL(req.url).pathname;

  if (path === '/api/settings/api-key') {
    if (req.method === 'GET') {
      return jsonResponse({ apiKey: getUnifiedApiKey() });
    }
    if (req.method === 'POST' && path.endsWith('/regenerate')) {
      const newKey = regenerateUnifiedKey();
      return jsonResponse({ apiKey: newKey });
    }
  }

  return new Response('Not Found', { status: 404 });
}
