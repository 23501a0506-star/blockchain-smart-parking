import { supabase } from './supabase';

export type SlotStatus = 'available' | 'reserved' | 'occupied' | 'maintenance';

export interface Slot {
  id: number;
  label: string;
  zone: string;
  base_status: 'available' | 'maintenance';
  // derived live status, computed client-side
}

export interface Reservation {
  id: string;
  slot_id: number;
  vehicle_reg: string;
  driver_name: string;
  reserve_date: string;
  start_time: string;
  duration_hours: number;
  status: 'active' | 'cancelled';
  tx_hash: string | null;
  created_at: string;
}

export interface Violation {
  id: string;
  vehicle_reg: string;
  violation_type: string;
  description: string;
  fine_amount: number;
  paid: boolean;
  tx_hash: string | null;
  pay_tx_hash: string | null;
  created_at: string;
}

export interface OnChainTransaction {
  id: string;
  tx_hash: string;
  kind: 'reservation' | 'cancellation' | 'violation' | 'payment';
  ref_id: string | null;
  status: 'confirmed' | 'pending' | 'failed';
  block_number: number | null;
  from_address: string | null;
  to_address: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

// ---------- Slots ----------

export async function fetchSlots(): Promise<Slot[]> {
  const { data, error } = await supabase
    .from('slots')
    .select('id, label, zone, base_status')
    .order('id', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Slot[];
}

// ---------- Reservations ----------

export async function fetchReservations(): Promise<Reservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Reservation[];
}

export interface NewReservation {
  slot_id: number;
  vehicle_reg: string;
  driver_name: string;
  reserve_date: string;
  start_time: string;
  duration_hours: number;
}

export async function createReservation(input: NewReservation): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      slot_id: input.slot_id,
      vehicle_reg: input.vehicle_reg.toUpperCase().trim(),
      driver_name: input.driver_name.trim(),
      reserve_date: input.reserve_date,
      start_time: input.start_time,
      duration_hours: input.duration_hours,
      status: 'active',
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const r = data as Reservation;
  await logTransaction({
    tx_hash: `pending-${r.id}`,
    kind: 'reservation',
    ref_id: r.id,
    status: 'pending',
    payload: { slot_id: r.slot_id, vehicle_reg: r.vehicle_reg, reserve_date: r.reserve_date, start_time: r.start_time, duration_hours: r.duration_hours },
  });
  return r;
}

export async function cancelReservation(id: string): Promise<Reservation> {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const r = data as Reservation;
  await logTransaction({
    tx_hash: `pending-cancel-${r.id}`,
    kind: 'cancellation',
    ref_id: r.id,
    status: 'pending',
    payload: { slot_id: r.slot_id, vehicle_reg: r.vehicle_reg },
  });
  return r;
}

// ---------- Violations ----------

export async function fetchViolations(): Promise<Violation[]> {
  const { data, error } = await supabase
    .from('violations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Violation[];
}

export interface NewViolation {
  vehicle_reg: string;
  violation_type: string;
  description: string;
  fine_amount: number;
}

export async function createViolation(input: NewViolation): Promise<Violation> {
  const { data, error } = await supabase
    .from('violations')
    .insert({
      vehicle_reg: input.vehicle_reg.toUpperCase().trim(),
      violation_type: input.violation_type,
      description: input.description.trim(),
      fine_amount: input.fine_amount,
      paid: false,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const v = data as Violation;
  await logTransaction({
    tx_hash: `pending-viol-${v.id}`,
    kind: 'violation',
    ref_id: v.id,
    status: 'pending',
    payload: { vehicle_reg: v.vehicle_reg, violation_type: v.violation_type, fine_amount: v.fine_amount },
  });
  return v;
}

export async function payViolation(id: string): Promise<Violation> {
  const { data, error } = await supabase
    .from('violations')
    .update({ paid: true })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  const v = data as Violation;
  await logTransaction({
    tx_hash: `pending-pay-${v.id}`,
    kind: 'payment',
    ref_id: v.id,
    status: 'pending',
    payload: { vehicle_reg: v.vehicle_reg, fine_amount: v.fine_amount },
  });
  return v;
}

// ---------- Transactions ----------

export async function fetchTransactions(): Promise<OnChainTransaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as OnChainTransaction[];
}

interface LogTxInput {
  tx_hash: string;
  kind: OnChainTransaction['kind'];
  ref_id: string | null;
  status: OnChainTransaction['status'];
  payload: Record<string, unknown>;
}

async function logTransaction(input: LogTxInput): Promise<void> {
  // Insert a transaction log row. When the Express + Hardhat backend is connected
  // (see server/ and blockchain/), the backend replaces the `pending-*` hash with
  // a real on-chain tx hash and block number by PATCHing this row.
  const { error } = await supabase.from('transactions').insert({
    tx_hash: input.tx_hash,
    kind: input.kind,
    ref_id: input.ref_id,
    status: input.status,
    payload: input.payload,
  });
  if (error) {
    // non-fatal: the primary record still succeeded
    console.warn('Failed to log transaction:', error.message);
  }
}

// ---------- Blockchain verification ----------

export interface VerifyResult {
  verified: boolean;
  message: string;
  onChain: Record<string, unknown> | null;
}

export async function verifyTransaction(txHash: string): Promise<VerifyResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
  const res = await fetch(`${supabaseUrl}/functions/v1/verify-tx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
    body: JSON.stringify({ txHash }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Verify request failed (${res.status}): ${txt}`);
  }
  const body = (await res.json()) as VerifyResult;
  return body;
}

// ---------- Helpers ----------

export function slotStatus(slot: Slot, reservations: Reservation[], now = new Date()): SlotStatus {
  if (slot.base_status === 'maintenance') return 'maintenance';
  const active = reservations.filter((r) => r.slot_id === slot.id && r.status === 'active');
  for (const r of active) {
    const start = new Date(`${r.reserve_date}T${r.start_time}`);
    const end = new Date(start.getTime() + r.duration_hours * 3600_000);
    if (now >= start && now <= end) return 'occupied';
    // upcoming reservation today -> reserved
    if (r.reserve_date === now.toISOString().slice(0, 10)) return 'reserved';
  }
  return 'available';
}

export function detectConflict(
  slotId: number,
  reservations: Reservation[],
  date: string,
  startTime: string,
  durationHours: number,
  ignoreId?: string,
): { conflict: boolean; with?: Reservation } {
  const newStart = new Date(`${date}T${startTime}`);
  const newEnd = new Date(newStart.getTime() + durationHours * 3600_000);
  for (const r of reservations) {
    if (r.status !== 'active') continue;
    if (r.slot_id !== slotId) continue;
    if (ignoreId && r.id === ignoreId) continue;
    const rStart = new Date(`${r.reserve_date}T${r.start_time}`);
    const rEnd = new Date(rStart.getTime() + r.duration_hours * 3600_000);
    if (newStart < rEnd && newEnd > rStart) {
      return { conflict: true, with: r };
    }
  }
  return { conflict: false };
}

export function shortHash(hash: string): string {
  if (!hash) return '—';
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}
