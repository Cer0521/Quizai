const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database.sqlite';

let db;

function getDb() {
  if (!db) {
    db = new sqlite3.Database(path.resolve(DB_PATH), (err) => {
      if (err) {
        console.error('Database connection error:', err.message);
        process.exit(1);
      }
      db.run('PRAGMA foreign_keys = ON');
    });
  }
  return db;
}

// Promisified helpers
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    getDb().run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

module.exports = { getDb, dbGet, dbAll, dbRun };
