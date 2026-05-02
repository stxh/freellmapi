export function getServerConfig() {
  const defaultServer = 'http://localhost:3001';
  const stored = localStorage.getItem('serverConfig');
  
  if (stored) {
    try {
      const config = JSON.parse(stored);
      return {
        serverUrl: config.serverUrl || defaultServer,
        token: config.token || ''
      };
    } catch {
      return { serverUrl: defaultServer, token: '' };
    }
  }
  
  return { serverUrl: defaultServer, token: '' };
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { serverUrl, token } = getServerConfig();
  
  const url = path.startsWith('http') ? path : `${serverUrl.replace(/\/$/, '')}${path}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...options?.headers
  };
  
  const res = await fetch(url, {
    headers,
    ...options,
  });
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
