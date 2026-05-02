import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { keysRouter } from './routes/keys.js';
import { modelsRouter } from './routes/models.js';
import { proxyRouter } from './routes/proxy.js';
import { fallbackRouter } from './routes/fallback.js';
import { analyticsRouter } from './routes/analytics.js';
import { healthRouter } from './routes/health.js';
import { settingsRouter } from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = typeof import.meta.url === 'string' && import.meta.url.startsWith('file:')
  ? new URL('.', import.meta.url).pathname.replace(/^\/([a-zA-Z]:\/?)/, '$1').replace(/\//g, '\\')
  : new URL('.', import.meta.url).toString();

export function createApp() {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false, hsts: false }));
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // API routes with debug logging
  app.use('/api/keys', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip} (${req.get('User-Agent') || 'unknown'})`);
    next();
  }, keysRouter);
  app.use('/api/models', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip} (${req.get('User-Agent') || 'unknown'})`);
    next();
  }, modelsRouter);
  app.use('/api/fallback', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip} (${req.get('User-Agent') || 'unknown'})`);
    next();
  }, fallbackRouter);
  app.use('/api/analytics', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip} (${req.get('User-Agent') || 'unknown'})`);
    next();
  }, analyticsRouter);
  app.use('/api/health', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip} (${req.get('User-Agent') || 'unknown'})`);
    next();
  }, healthRouter);
  app.use('/api/settings', (req, res, next) => {
    console.log(`[API] ${req.method} ${req.path} from ${req.ip} (${req.get('User-Agent') || 'unknown'})`);
    next();
  }, settingsRouter);

  // OpenAI-compatible proxy
  app.use('/v1', proxyRouter);

  // Health check - with detailed client debug information
  app.get('/api/ping', (req, res) => {
    const debugInfo = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      clientInfo: {
        // Request metadata
        method: req.method,
        url: req.url,
        path: req.path,
        query: req.query,
        params: req.params,
        
        // Client identification
        clientIP: req.ip || req.socket.remoteAddress || 
                 (req.connection as any)?.socket?.remoteAddress || '',
        userAgent: req.get('User-Agent') || '',
        clientHost: req.get('Host') || '',
        referer: req.get('Referer') || '',
        origin: req.get('Origin') || '',
        acceptEncoding: req.get('Accept-Encoding') || '',
        acceptLanguage: req.get('Accept-Language') || '',
        
        // Connection details
        protocol: req.protocol,
        secure: req.secure,
        httpVersion: req.httpVersion,
        connectionId: (req.connection as any).id || 'undefined',
        socketLocalAddress: req.socket.localAddress || '',
        socketLocalPort: req.socket.localPort || 0,
        socketRemotePort: req.socket.remotePort || 0,
        
        // Headers (full list)
        headers: req.headers,
        
        // Session/cookie info
        cookies: req.cookies || {},
        sessionID: (req as any).sessionID || 'none',
        
        // Additional request context
        forwarded: req.get('X-Forwarded-For') || req.get('x-forwarded-for') || '',
        realIP: req.get('X-Real-IP') || req.get('x-real-ip') || '',
        via: req.get('Via') || '',
        contentLength: req.get('Content-Length') || '0',
        contentType: req.get('Content-Type') || '',
        
        // Connection timing if available
        requestStartTime: (req as any)._startTime ? new Date((req as any)._startTime).toISOString() : 'unknown',
        connectionCreationTime: (req.connection as any)?.bytesRead ? 'active' : 'new',
        
        // Routing info
        baseUrl: req.baseUrl || '',
        originalUrl: req.originalUrl || '',
        subdomains: req.subdomains || [],
        
        // Server context
        serverName: req.hostname || req.get('Host') || '',
        trustProxy: req.app.get('trust proxy') || false
      },
      serverInfo: {
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        pid: process.pid
      }
    };

    // Log connection details to server console
    console.log(`\n=== CLIENT CONNECTION DEBUG ===`);
    console.log(`Timestamp: ${debugInfo.timestamp}`);
    console.log(`Client IP: ${debugInfo.clientInfo.clientIP}`);
    console.log(`User Agent: ${debugInfo.clientInfo.userAgent}`);
    console.log(`Request URL: ${debugInfo.clientInfo.url}`);
    console.log(`Protocol: ${debugInfo.clientInfo.protocol}`);
    console.log(`Forwarded For: ${debugInfo.clientInfo.forwarded || 'none'}`);
    console.log(`Real IP: ${debugInfo.clientInfo.realIP || 'none'}`);
    console.log(`Host: ${debugInfo.clientInfo.clientHost}`);
    console.log(`Origin: ${debugInfo.clientInfo.origin || 'none'}`);
    console.log(`Referer: ${debugInfo.clientInfo.referer || 'none'}`);
    console.log(`Accept-Language: ${debugInfo.clientInfo.acceptLanguage}`);
    console.log(`Query params: ${JSON.stringify(debugInfo.clientInfo.query)}`);
    console.log(`Connection details: local=${debugInfo.clientInfo.socketLocalAddress}:${debugInfo.clientInfo.socketLocalPort}, remote=${debugInfo.clientInfo.clientIP}:${debugInfo.clientInfo.socketRemotePort}`);
    console.log(`Server uptime: ${debugInfo.serverInfo.uptime.toFixed(2)}s, memory: ${Math.round(debugInfo.serverInfo.memoryUsage.rss / 1024 / 1024)}MB RSS`);
    console.log('=== END DEBUG ===\n');

    res.json(debugInfo);
  });

  // Error handler (for API routes)
  app.use(errorHandler);

  // Serve client static files (after API error handler)
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  // SPA fallback — serve index.html for non-API routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/v1/')) {
      next();
      return;
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });

  return app;
}
