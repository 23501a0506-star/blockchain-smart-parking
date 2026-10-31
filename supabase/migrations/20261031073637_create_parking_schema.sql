/*
# Smart Parking Reservation & Violation Management schema

1. Overview
   Single-tenant demo application (no sign-in). The browser talks to Supabase
   with the anon key, so every policy lists `anon, authenticated` and the data
   is intentionally shared/public. This powers the live, in-Bolt demo.

2. New Tables
   - `slots` — parking slots (A1..D6 grid). Columns: id (int PK), label, zone,
     base_status (available/maintenance). The live display status is derived
     from active reservations but a base status is kept for maintenance slots.
   - `reservations` — booking records. Columns: id (uuid), slot_id (int FK),
     vehicle_reg, driver_name, reserve_date (date), start_time (text HH:MM),
     duration_hours (numeric), status (active/cancelled), tx_hash (blockchain
     tx hash, nullable), created_at.
   - `violations` — violation/fine records. Columns: id (uuid), vehicle_reg,
     violation_type, description, fine_amount (numeric), paid (bool),
     tx_hash (recording tx), pay_tx_hash (payment tx), created_at.
   - `transactions` — on-chain transaction log mirrored from the blockchain
     layer. Columns: id (uuid), tx_hash, kind (reservation/cancellation/
     violation/payment), ref_id (uuid, related record), status
     (confirmed/pending/failed), block_number (bigint), from_address,
     to_address, payload (jsonb), created_at.

3. Security
   - RLS enabled on all four tables.
   - Grants: full CRUD to anon + authenticated on all tables (single-tenant,
     intentionally shared demo data).
   - Policies: per-verb (select/insert/update/delete) with USING(true) /
     WITH CHECK(true), documented as intentional public shared data.

4. Notes
   - Sample slots seeded for zones A-D (24 slots).
   - All ids referenced via FK with ON DELETE CASCADE where applicable.
   - Indexes added on frequently-queried columns (slot_id, status, tx_hash).
*/

CREATE TABLE IF NOT EXISTS slots (
  id integer PRIMARY KEY,
  label text NOT NULL,
  zone text NOT NULL,
  base_status text NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id integer NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  vehicle_reg text NOT NULL,
  driver_name text NOT NULL,
  reserve_date date NOT NULL,
  start_time text NOT NULL,
  duration_hours numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  tx_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_reg text NOT NULL,
  violation_type text NOT NULL,
  description text NOT NULL DEFAULT '',
  fine_amount numeric NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  tx_hash text,
  pay_tx_hash text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash text NOT NULL,
  kind text NOT NULL,
  ref_id uuid,
  status text NOT NULL DEFAULT 'confirmed',
  block_number bigint,
  from_address text,
  to_address text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations(slot_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_violations_paid ON violations(paid);
CREATE INDEX IF NOT EXISTS idx_transactions_kind ON transactions(kind);
CREATE INDEX IF NOT EXISTS idx_transactions_txhash ON transactions(tx_hash);

ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON slots TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON reservations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON violations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON transactions TO anon, authenticated;

-- slots policies (public shared demo data)
DROP POLICY IF EXISTS "anon_select_slots" ON slots;
CREATE POLICY "anon_select_slots" ON slots FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_slots" ON slots;
CREATE POLICY "anon_insert_slots" ON slots FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_slots" ON slots;
CREATE POLICY "anon_update_slots" ON slots FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_slots" ON slots;
CREATE POLICY "anon_delete_slots" ON slots FOR DELETE
  TO anon, authenticated USING (true);

-- reservations policies
DROP POLICY IF EXISTS "anon_select_reservations" ON reservations;
CREATE POLICY "anon_select_reservations" ON reservations FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_reservations" ON reservations;
CREATE POLICY "anon_insert_reservations" ON reservations FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_reservations" ON reservations;
CREATE POLICY "anon_update_reservations" ON reservations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_reservations" ON reservations;
CREATE POLICY "anon_delete_reservations" ON reservations FOR DELETE
  TO anon, authenticated USING (true);

-- violations policies
DROP POLICY IF EXISTS "anon_select_violations" ON violations;
CREATE POLICY "anon_select_violations" ON violations FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_violations" ON violations;
CREATE POLICY "anon_insert_violations" ON violations FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_violations" ON violations;
CREATE POLICY "anon_update_violations" ON violations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_violations" ON violations;
CREATE POLICY "anon_delete_violations" ON violations FOR DELETE
  TO anon, authenticated USING (true);

-- transactions policies
DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE
  TO anon, authenticated USING (true);

-- Seed sample parking slots: zones A-D, 6 slots each (24 total)
INSERT INTO slots (id, label, zone, base_status) VALUES
(1,'A1','A','available'),(2,'A2','A','available'),(3,'A3','A','available'),
(4,'A4','A','available'),(5,'A5','A','available'),(6,'A6','A','available'),
(7,'B1','B','available'),(8,'B2','B','available'),(9,'B3','B','available'),
(10,'B4','B','available'),(11,'B5','B','available'),(12,'B6','B','available'),
(13,'C1','C','available'),(14,'C2','C','available'),(15,'C3','C','available'),
(16,'C4','C','available'),(17,'C5','C','available'),(18,'C6','C','maintenance'),
(19,'D1','D','available'),(20,'D2','D','available'),(21,'D3','D','available'),
(22,'D4','D','available'),(23,'D5','D','available'),(24,'D6','D','available')
ON CONFLICT (id) DO NOTHING;
