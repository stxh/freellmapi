import { getDb } from './db/index.js';

const db = getDb();
console.log('Database connected');

// Check all settings
const allSettings = db.prepare('SELECT * FROM settings').all();
console.log('All settings:', JSON.stringify(allSettings, null, 2));

// Check unified_api_key specifically
const keyRow = db.prepare('SELECT value FROM settings WHERE key = "unified_api_key"').get();
console.log('Unified API key row:', keyRow);

if (keyRow) {
  console.log('Unified API key value:', keyRow.value);
  console.log('Key length:', keyRow.value.length);
  console.log('Key preview:', keyRow.value.substring(0, 50) + '...');
} else {
  console.log('No unified_api_key found in database');
}