export async function parseJson(req: Request): Promise<any> {
  try {
    const text = await req.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch (err) {
    throw new Error('Invalid JSON');
  }
}

export function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 500): Response {
  return jsonResponse({ error: { message, type: 'server_error' } }, status);
}
