const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/freeapi.db');

db.get('SELECT value FROM settings WHERE key = "unified_api_key"', (err, row) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Row found:', !!row);
    if (row) {
      console.log('Key value:', row.value);
      console.log('Key length:', row.value.length);
      console.log('Key preview:', row.value.substring(0, 50));
    }
  }
  db.close();
});