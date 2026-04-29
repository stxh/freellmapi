import { createApp } from './app.js';
import { initDb } from './db/index.js';
import { startHealthChecker } from './services/health.js';
import path from 'path';
import { fileURLToPath } from 'url';

const PORT = process.env.PORT ?? 3001;
const __filename = import.meta.url.startsWith('file:') ? fileURLToPath(import.meta.url) : import.meta.url;
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'data', 'freeapi.db');

async function main() {
  initDb(DB_PATH);
  const app = createApp();

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Proxy endpoint: http://0.0.0.0:${PORT}/v1/chat/completions`);
    startHealthChecker();
  });
}

main().catch(console.error);
