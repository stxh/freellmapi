import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.FREEAPI_DB_PATH || path.resolve(__dirname, '../../data/freeapi.db');
const DB_FILENAME = path.basename(DB_PATH);

const HF_TOKEN = process.env.HF_TOKEN;
const HF_DATASET_ID = process.env.HF_DATASET_ID || '';
const BACKUP_ENABLED = process.env.BACKUP_ENABLED === 'true';
const BACKUP_INTERVAL_MS = Number(process.env.BACKUP_INTERVAL_MS ?? 86400000);
const KEEP_BACKUPS = Number(process.env.KEEP_BACKUPS ?? 3);

const BACKUP_PREFIX = 'backup_';
const BACKUP_SUFFIX = '.db';

function log(msg: string) {
  console.log(`[Backup] ${msg}`);
}

function hfHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${HF_TOKEN}` };
}

function parseBackupTimestamp(filename: string): number {
  const m = filename.match(/backup_(\d{8})_(\d{6})\.db/);
  if (!m) return 0;
  return new Date(`${m[1].slice(0,4)}-${m[1].slice(4,6)}-${m[1].slice(6,8)}T${m[2].slice(0,2)}:${m[2].slice(2,4)}:${m[2].slice(4,6)}`).getTime();
}

function findActualDb(): string | null {
  const candidates = [
    DB_PATH,
    `/app/server/data/${DB_FILENAME}`,
    `/app/data/${DB_FILENAME}`,
    `/app/server/dist/data/${DB_FILENAME}`,
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  for (const root of ['/app', '/app/server', process.cwd()]) {
    try {
      const walk = (dir: string): string | null => {
        try {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
              const found = walk(full);
              if (found) return found;
            } else if (entry.isFile() && entry.name === DB_FILENAME) {
              return full;
            }
          }
        } catch { }
        return null;
      };
      const found = walk(root);
      if (found) return found;
    } catch { }
  }
  return null;
}

function createSnapshot(src: string, dst: string): boolean {
  try {
    execSync(`sqlite3 "${src}" ".backup ${dst}"`, { timeout: 30000, stdio: 'pipe' });
    return true;
  } catch {
    log('sqlite3 CLI not available, using file copy');
  }
  try {
    fs.copyFileSync(src, dst);
    return true;
  } catch (e) {
    log(`File copy failed: ${e}`);
    return false;
  }
}

export async function restoreLatestBackup(): Promise<boolean> {
  if (!BACKUP_ENABLED || !HF_TOKEN || !HF_DATASET_ID) {
    log('Backup not configured, skipping restore.');
    return false;
  }

  try {
    log('Checking for remote backups...');
    const res = await fetch(`https://huggingface.co/api/datasets/${HF_DATASET_ID}`, {
      headers: hfHeaders(),
    });

    if (res.status === 404) {
      log('Dataset not found, skipping restore.');
      return false;
    }
    if (!res.ok) throw new Error(`list failed: ${res.status} ${res.statusText}`);

    const data = await res.json() as any;
    const files: string[] = (data.siblings || []).map((s: any) => s.rfilename).filter(Boolean);
    const backups = files.filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_SUFFIX)).sort();

    if (backups.length === 0) {
      log('No backups found in dataset.');
      return false;
    }

    const latest = backups[backups.length - 1];
    log(`Found latest backup: ${latest}`);

    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    if (fs.existsSync(DB_PATH)) {
      const localBak = path.join(dataDir, `local_before_restore_${Date.now()}.db`);
      fs.copyFileSync(DB_PATH, localBak);
      log(`Local DB backed up to ${localBak}`);
    }

    const dlRes = await fetch(`https://huggingface.co/datasets/${HF_DATASET_ID}/resolve/main/${latest}`, {
      headers: hfHeaders(),
    });
    if (!dlRes.ok) throw new Error(`download failed: ${dlRes.status}`);
    const buffer = Buffer.from(await dlRes.arrayBuffer());
    fs.writeFileSync(DB_PATH, buffer);
    log(`Restored ${latest} to ${DB_PATH} (${buffer.length} bytes)`);
    return true;
  } catch (err) {
    console.error('[Backup] Restore failed:', err);
    return false;
  }
}

export async function createBackup(): Promise<boolean> {
  if (!BACKUP_ENABLED || !HF_TOKEN || !HF_DATASET_ID) {
    log('Backup not configured, skipping backup.');
    return false;
  }

  const actualDb = findActualDb();
  if (!actualDb) {
    log('Database file not found, skip backup');
    return false;
  }

  const tmpPath = path.join(path.dirname(actualDb), `.tmp_backup_${Date.now()}.db`);

  try {
    if (!createSnapshot(actualDb, tmpPath)) return false;

    const ts = new Date();
    const dateStr = ts.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = ts.toTimeString().slice(0, 8).replace(/:/g, '');
    const filename = `${BACKUP_PREFIX}${dateStr}_${timeStr}${BACKUP_SUFFIX}`;

    log(`Creating backup: ${filename}`);

    const fileBuffer = fs.readFileSync(tmpPath);
    const uploadRes = await fetch(`https://huggingface.co/api/datasets/${HF_DATASET_ID}/content/${filename}`, {
      method: 'PUT',
      headers: { ...hfHeaders(), 'Content-Type': 'application/octet-stream' },
      body: fileBuffer,
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text();
      throw new Error(`Upload failed: ${uploadRes.status} ${uploadRes.statusText} - ${text}`);
    }

    log(`Uploaded ${filename} successfully.`);
    await cleanupOldBackups();
    return true;
  } catch (err) {
    console.error('[Backup] Backup creation failed:', err);
    return false;
  } finally {
    try { fs.unlinkSync(tmpPath); } catch { }
  }
}

async function cleanupOldBackups(): Promise<void> {
  if (KEEP_BACKUPS <= 0) return;

  try {
    const res = await fetch(`https://huggingface.co/api/datasets/${HF_DATASET_ID}`, {
      headers: hfHeaders(),
    });
    if (!res.ok) return;

    const data = await res.json() as any;
    const files: string[] = (data.siblings || []).map((s: any) => s.rfilename).filter(Boolean);
    const backups = files.filter(f => f.startsWith(BACKUP_PREFIX) && f.endsWith(BACKUP_SUFFIX))
      .map(f => ({ name: f, ts: parseBackupTimestamp(f) }))
      .filter(f => f.ts > 0)
      .sort((a, b) => a.ts - b.ts);

    if (backups.length <= KEEP_BACKUPS) return;

    const toDelete = backups.slice(0, backups.length - KEEP_BACKUPS);
    for (const { name } of toDelete) {
      try {
        await fetch(`https://huggingface.co/api/datasets/${HF_DATASET_ID}/content/${name}`, {
          method: 'DELETE',
          headers: hfHeaders(),
        });
        log(`Cleaned up old backup: ${name}`);
      } catch (e: any) {
        log(`Failed to delete ${name}: ${e.message || e}`);
      }
    }
  } catch (err) {
    console.error('[Backup] Cleanup failed:', err);
  }
}

export function startBackupScheduler(): void {
  if (!BACKUP_ENABLED) {
    log('Backup scheduler disabled.');
    return;
  }
  log(`Backup scheduler started (interval: ${BACKUP_INTERVAL_MS / 1000}s)`);
  setTimeout(() => {
    createBackup().catch(console.error);
    setInterval(() => createBackup().catch(console.error), BACKUP_INTERVAL_MS);
  }, BACKUP_INTERVAL_MS);
}
