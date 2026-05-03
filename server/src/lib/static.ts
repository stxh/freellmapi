import path from 'path';
import fs from 'fs';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
};

export function serveStatic(webDir: string) {
  return async function(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    let pathname = url.pathname;
    
    // Skip API routes
    if (pathname.startsWith('/api/') || pathname.startsWith('/v1/')) {
      return null;
    }
    
    try {
      let filePath: string;
      
      if (pathname === '/') {
        filePath = path.join(webDir, 'index.html');
      } else {
        // Remove leading slash
        const relativePath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        filePath = path.join(webDir, relativePath);
      }
      
      // Security: ensure file is within webDir
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(path.resolve(webDir))) {
        return null;
      }
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        // SPA fallback - serve index.html for non-asset requests
        const isAsset = path.extname(filePath) !== '';
        if (!isAsset) {
          filePath = path.join(webDir, 'index.html');
        } else {
          return null;
        }
      }
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        return null;
      }
      
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
      
      return new Response(Bun.file(filePath), {
        headers: { 
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable'
        },
      });
    } catch (err) {
      console.error('[Static] Error:', err);
      return null;
    }
  };
}
