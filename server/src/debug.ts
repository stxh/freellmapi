import path from 'path';

const testUrl = 'file:///E:/AiCode/freellmapi/server/src/db/index.ts';
const url = new URL('.', testUrl);
console.log('Test URL:', testUrl);
console.log('URL .:', url.toString());
console.log('pathname:', url.pathname);
console.log('path.resolve:', path.resolve(url.pathname));

// Test the current logic
const __dirname = typeof url === 'string' && url.startsWith('file:')
  ? new URL('.', url).pathname.replace(/^\/([a-zA-Z]:\/?)/, '$1').replace(/\//g, '\\')
  : new URL('.', url).toString();
console.log('__dirname:', __dirname);
console.log('path.dirname(resolvedPath):', path.dirname(path.resolve(__dirname, '../../data/freeapi.db')));