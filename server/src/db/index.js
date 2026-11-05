import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SCHEMA_SQL } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'loan_collection.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec(SCHEMA_SQL);

/**
 * Thin wrapper so the rest of the app can keep better-sqlite3-style usage:
 * prepare().get/all/run and db.transaction(fn)
 */
const api = {
  prepare(sql) {
    const stmt = db.prepare(sql);
    return {
      get(...params) {
        return stmt.get(...params);
      },
      all(...params) {
        return stmt.all(...params);
      },
      run(...params) {
        const result = stmt.run(...params);
        return {
          changes: result.changes,
          lastInsertRowid: Number(result.lastInsertRowid),
        };
      },
    };
  },
  exec(sql) {
    db.exec(sql);
  },
  transaction(fn) {
    return (...args) => {
      db.exec('BEGIN');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    };
  },
};

export default api;
