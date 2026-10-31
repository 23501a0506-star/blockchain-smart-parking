import { useMemo, useState } from 'react';
import { CircleParking, CalendarDays, Clock, User, Truck, X, CheckCircle2 } from 'lucide-react';
import { SectionCard, Spinner, StatusDot } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useQuery } from '@/lib/useQuery';
import {
  cancelReservation,
  createReservation,
  detectConflict,
  fetchReservations,
  fetchSlots,
  slotStatus,
  type Reservation,
  type Slot,
} from '@/lib/api';

const ZONE_COLORS: Record<string, string> = {
  A: 'from-teal-500/20 to-teal-500/5',
  B: 'from-sky-500/20 to-sky-500/5',
  C: 'from-violet-500/20 to-violet-500/5',
  D: 'from-amber-500/20 to-amber-500/5',
};

function statusStyle(status: string): string {
  switch (status) {
    case 'available':
      return 'border-emerald-500/40 bg-emerald-950/30 hover:border-emerald-400/70 hover:bg-emerald-950/50';
    case 'reserved':
      return 'border-amber-500/40 bg-amber-950/30 hover:border-amber-400/70';
    case 'occupied':
      return 'border-rose-500/40 bg-rose-950/30 opacity-90 cursor-not-allowed';
    case 'maintenance':
      return 'border-slate-600/40 bg-slate-800/40 opacity-60 cursor-not-allowed';
    default:
      return 'border-navy-700 bg-navy-900';
  }
}

export default function ReservationView() {
  const { notify } = useToast();
  const slotsQ = useQuery(fetchSlots, ['slots']);
  const resQ = useQuery(fetchReservations, ['reservations']);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const slots = slotsQ.data ?? [];
  const reservations = resQ.data ?? [];
  const now = new Date();

  const derived = useMemo(
    () => slots.map((s) => ({ ...s, status: slotStatus(s, reservations, now) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slots, reservations],
  );

  const activeReservations = reservations.filter((r) => r.status === 'active');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Slot grid */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Parking Slot Grid"
            subtitle="Select an available slot to reserve. Live status updates every few seconds."
            action={
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <Legend color="bg-emerald-400" label="Available" />
                <Legend color="bg-amber-400" label="Reserved" />
                <Legend color="bg-rose-400" label="Occupied" />
                <Legend color="bg-slate-500" label="Maintenance" />
              </div>
            }
          >
            {slotsQ.isLoading ? (
              <Spinner label="Loading slots…" />
            ) : slotsQ.error ? (
              <p className="text-sm text-rose-300">{(slotsQ.error as Error).message}</p>
            ) : (
              <div className="space-y-5">
                {['A', 'B', 'C', 'D'].map((zone) => (
                  <div key={zone}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`chip bg-gradient-to-r ${ZONE_COLORS[zone]} border border-navy-700 text-white`}>
                        Zone {zone}
                      </span>
                      <span className="text-xs text-slate-500">
                        {derived.filter((s) => s.zone === zone && s.status === 'available').length} free
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                      {derived
                        .filter((s) => s.zone === zone)
                        .map((s) => (
                          <button
                            key={s.id}
                            disabled={s.status === 'occupied' || s.status === 'maintenance'}
                            onClick={() => setSelectedSlot(s)}
                            className={`group relative flex h-20 flex-col items-center justify-center rounded-lg border bg-gradient-to-b ${ZONE_COLORS[zone]} ${statusStyle(s.status)} transition focus:outline-none focus:ring-2 focus:ring-teal-400 ${
                              selectedSlot?.id === s.id ? 'ring-2 ring-teal-400' : ''
                            }`}
                          >
                            <CircleParking className="mb-1 h-6 w-6 text-slate-200" />
                            <span className="font-mono text-sm font-bold text-white">{s.label}</span>
                            <span className="absolute right-1.5 top-1.5">
                              <StatusDot status={s.status} />
                            </span>
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        {/* Form + list */}
        <div className="space-y-6">
          <ReservationForm
            slot={selectedSlot}
            reservations={reservations}
            submitting={submitting}
            onSubmit={async (vals) => {
              if (!selectedSlot) return;
              const conflict = detectConflict(
                selectedSlot.id,
                reservations,
                vals.reserve_date,
                vals.start_time,
                vals.duration_hours,
              );
              if (conflict.conflict) {
                notify(
                  `Time conflict on ${selectedSlot.label} with reservation ${conflict.with?.vehicle_reg}`,
                  'error',
                );
                return;
              }
              setSubmitting(true);
              try {
                const r = await createReservation({ ...vals, slot_id: selectedSlot.id });
                notify(`Slot ${selectedSlot.label} reserved for ${r.vehicle_reg}. Recorded on chain.`, 'success');
                setSelectedSlot(null);
                resQ.refetch();
              } catch (e) {
                notify(`Reservation failed: ${(e as Error).message}`, 'error');
              } finally {
                setSubmitting(false);
              }
            }}
            onCancel={() => setSelectedSlot(null)}
          />

          <SectionCard title="Active Reservations" subtitle={`${activeReservations.length} active`}>
            {resQ.isLoading ? (
              <Spinner label="Loading…" />
            ) : activeReservations.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No active reservations.</p>
            ) : (
              <ul className="space-y-2.5">
                {activeReservations.map((r) => {
                  const slot = slots.find((s) => s.id === r.slot_id);
                  return (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-navy-800 bg-navy-950/40 p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold text-teal-300">
                            {slot?.label ?? `#${r.slot_id}`}
                          </span>
                          <span className="font-mono text-xs text-slate-400">{r.vehicle_reg}</span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {r.driver_name} · {r.reserve_date} {r.start_time} · {r.duration_hours}h
                        </p>
                      </div>
                      <button
                        className="btn-ghost px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-950/40"
                        onClick={async () => {
                          try {
                            await cancelReservation(r.id);
                            notify(`Reservation ${r.vehicle_reg} cancelled. Cancellation recorded on chain.`, 'info');
                            resQ.refetch();
                          } catch (e) {
                            notify(`Cancel failed: ${(e as Error).message}`, 'error');
                          }
                        }}
                      >
                        <X className="h-3.5 w-3.5" /> Cancel
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-400">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} /> {label}
    </span>
  );
}

interface FormValues {
  vehicle_reg: string;
  driver_name: string;
  reserve_date: string;
  start_time: string;
  duration_hours: number;
}

function ReservationForm({
  slot,
  reservations,
  submitting,
  onSubmit,
  onCancel,
}: {
  slot: Slot | null;
  reservations: Reservation[];
  submitting: boolean;
  onSubmit: (vals: FormValues) => void;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [vals, setVals] = useState<FormValues>({
    vehicle_reg: '',
    driver_name: '',
    reserve_date: today,
    start_time: '09:00',
    duration_hours: 2,
  });
  const conflict = slot
    ? detectConflict(slot.id, reservations, vals.reserve_date, vals.start_time, vals.duration_hours)
    : { conflict: false };

  return (
    <SectionCard title="New Reservation" subtitle={slot ? `Slot ${slot.label} · Zone ${slot.zone}` : 'Select a slot'}>
      {!slot ? (
        <p className="py-6 text-center text-sm text-slate-500">
          Pick an available slot from the grid to start a reservation.
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!vals.vehicle_reg.trim() || !vals.driver_name.trim()) return;
            onSubmit(vals);
          }}
        >
          <div>
            <label className="label">Vehicle Registration</label>
            <div className="relative">
              <Truck className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                className="input pl-9 font-mono uppercase"
                placeholder="ABC-1234"
                value={vals.vehicle_reg}
                onChange={(e) => setVals({ ...vals, vehicle_reg: e.target.value.toUpperCase() })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Driver Name</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
              <input
                className="input pl-9"
                placeholder="Jane Doe"
                value={vals.driver_name}
                onChange={(e) => setVals({ ...vals, driver_name: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date</label>
              <div className="relative">
                <CalendarDays className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="date"
                  className="input pl-9"
                  value={vals.reserve_date}
                  min={today}
                  onChange={(e) => setVals({ ...vals, reserve_date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div>
              <label className="label">Start Time</label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="time"
                  className="input pl-9"
                  value={vals.start_time}
                  onChange={(e) => setVals({ ...vals, start_time: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>
          <div>
            <label className="label">Duration (hours)</label>
            <select
              className="input"
              value={vals.duration_hours}
              onChange={(e) => setVals({ ...vals, duration_hours: Number(e.target.value) })}
            >
              {[1, 2, 3, 4, 6, 8, 12, 24].map((h) => (
                <option key={h} value={h}>
                  {h} hour{h > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>

          {conflict.conflict && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-xs text-rose-200">
              Overlaps with existing reservation for {conflict.with?.vehicle_reg} ({conflict.with?.start_time},{' '}
              {conflict.with?.duration_hours}h). Choose a different time.
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" className="btn-primary flex-1" disabled={submitting || conflict.conflict}>
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? 'Recording…' : 'Confirm Reservation'}
            </button>
            <button type="button" className="btn-ghost" onClick={onCancel}>
              Clear
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Submitting records the reservation to the database and emits a reservation transaction on the blockchain.
          </p>
        </form>
      )}
    </SectionCard>
  );
}
