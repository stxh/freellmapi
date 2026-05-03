const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '*').split(',').map(s => s.trim());

export function handleCors(req: Request, res: Response): Response {
  const origin = req.headers.get('origin');
  
  const headers = new Headers(res.headers);
  
  if (origin && (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin))) {
    headers.set('Access-Control-Allow-Origin', origin);
  } else if (ALLOWED_ORIGINS.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  }
  
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Allow-Credentials', 'true');
  
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

export function isPreflight(req: Request): boolean {
  return req.method === 'OPTIONS' && req.headers.has('origin') && req.headers.has('access-control-request-method');
}
