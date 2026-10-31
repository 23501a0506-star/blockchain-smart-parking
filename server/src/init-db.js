import { openDb } from './db.js';

/**
 * Initialize the SQLite database with the full schema and seed sample slots.
 * Safe to re-run (uses CREATE TABLE IF NOT EXISTS and INSERT OR IGNORE).
 */
export function initDatabase() {
  const db = openDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS slots (
      id INTEGER PRIMARY KEY,
      label TEXT NOT NULL UNIQUE,
      zone TEXT NOT NULL,
      base_status TEXT NOT NULL DEFAULT 'available'
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      slot_id INTEGER NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
      vehicle_reg TEXT NOT NULL,
      driver_name TEXT NOT NULL,
      reserve_date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      duration_hours REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      tx_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS violations (
      id TEXT PRIMARY KEY,
      vehicle_reg TEXT NOT NULL,
      violation_type TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      fine_amount REAL NOT NULL DEFAULT 0,
      paid INTEGER NOT NULL DEFAULT 0,
      tx_hash TEXT,
      pay_tx_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      tx_hash TEXT NOT NULL,
      kind TEXT NOT NULL,
      ref_id TEXT,
      status TEXT NOT NULL DEFAULT 'confirmed',
      block_number INTEGER,
      from_address TEXT,
      to_address TEXT,
      payload TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_res_slot ON reservations(slot_id);
    CREATE INDEX IF NOT EXISTS idx_res_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_viol_paid ON violations(paid);
    CREATE INDEX IF NOT EXISTS idx_tx_kind ON transactions(kind);
  `);

  const seedSlots = db.prepare(
    `INSERT OR IGNORE INTO slots (id, label, zone, base_status) VALUES (?, ?, ?, ?)`,
  );
  const zones = ['A', 'B', 'C', 'D'];
  let id = 1;
  for (const zone of zones) {
    for (let n = 1; n <= 6; n++) {
      const label = `${zone}${n}`;
      const status = zone === 'C' && n === 6 ? 'maintenance' : 'available';
      seedSlots.run(id, label, zone, status);
      id++;
    }
  }

  console.log(`[db] initialized. ${db.prepare('SELECT COUNT(*) as c FROM slots').get().c} slots seeded.`);
  db.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  initDatabase();
}
