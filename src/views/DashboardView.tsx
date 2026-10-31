import { useQuery } from '@/lib/useQuery';
import { Car, CheckCircle2, Clock, Coins, ListChecks, CircleParking, AlertTriangle } from 'lucide-react';
import { StatCard, SectionCard, Spinner, EmptyState, StatusDot } from '@/components/ui';
import { fetchReservations, fetchSlots, fetchTransactions, fetchViolations, shortHash, slotStatus } from '@/lib/api';

export default function DashboardView({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const slotsQ = useQuery(fetchSlots, ['slots']);
  const resQ = useQuery(fetchReservations, ['reservations']);
  const vioQ = useQuery(fetchViolations, ['violations']);
  const txQ = useQuery(fetchTransactions, ['transactions']);

  if (slotsQ.isLoading || resQ.isLoading || vioQ.isLoading || txQ.isLoading) {
    return <Spinner label="Loading dashboard…" />;
  }
  if (slotsQ.error || resQ.error || vioQ.error || txQ.error) {
    return (
      <p className="text-sm text-rose-300">
        Failed to load dashboard: {(slotsQ.error || resQ.error || vioQ.error || txQ.error as Error)?.message}
      </p>
    );
  }

  const slots = slotsQ.data ?? [];
  const reservations = resQ.data ?? [];
  const violations = vioQ.data ?? [];
  const transactions = txQ.data ?? [];
  const now = new Date();

  const available = slots.filter((s) => slotStatus(s, reservations, now) === 'available').length;
  const occupied = slots.filter((s) => slotStatus(s, reservations, now) === 'occupied').length;
  const reserved = slots.filter((s) => slotStatus(s, reservations, now) === 'reserved').length;
  const activeRes = reservations.filter((r) => r.status === 'active').length;
  const unpaidFines = violations.filter((v) => !v.paid).length;
  const unpaidAmount = violations
    .filter((v) => !v.paid)
    .reduce((sum, v) => sum + Number(v.fine_amount), 0);
  const recentTx = transactions.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Slots" value={slots.length} icon={<CircleParking className="h-6 w-6" />} accent="navy" />
        <StatCard label="Available" value={available} icon={<CheckCircle2 className="h-6 w-6" />} accent="emerald" />
        <StatCard label="Occupied" value={occupied} icon={<Car className="h-6 w-6" />} accent="rose" />
        <StatCard label="Reserved" value={reserved} icon={<Clock className="h-6 w-6" />} accent="amber" />
        <StatCard
          label="Active Reservations"
          value={activeRes}
          icon={<ListChecks className="h-6 w-6" />}
          accent="teal"
        />
        <StatCard
          label="Unpaid Fines"
          value={unpaidFines}
          icon={<Coins className="h-6 w-6" />}
          accent="amber"
          hint={`Total due: $${unpaidAmount.toFixed(2)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          title="Recent Blockchain Transactions"
          subtitle="Latest on-chain records"
          className="lg:col-span-2"
          action={
            <button onClick={() => onNavigate('transactions')} className="btn-ghost text-xs">
              View all
            </button>
          }
        >
          {recentTx.length === 0 ? (
            <EmptyState message="No blockchain transactions yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr className="border-b border-navy-800">
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Tx Hash</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Block</th>
                    <th className="py-2 pr-4 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-800/70">
                  {recentTx.map((t) => (
                    <tr key={t.id} className="table-row-hover">
                      <td className="py-2.5 pr-4 capitalize">
                        <span className="chip bg-navy-800 text-teal-300">{t.kind}</span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-300">{shortHash(t.tx_hash)}</td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-2 text-xs">
                          <StatusDot status={t.status} /> {t.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-400">
                        {t.block_number ?? '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-xs text-slate-400">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Unpaid Violations" subtitle="Outstanding fines">
          {violations.filter((v) => !v.paid).length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-8 w-8 text-slate-600" />}
              message="No outstanding fines."
            />
          ) : (
            <ul className="space-y-3">
              {violations
                .filter((v) => !v.paid)
                .slice(0, 5)
                .map((v) => (
                  <li key={v.id} className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm text-amber-200">{v.vehicle_reg}</span>
                      <span className="font-semibold text-amber-300">${Number(v.fine_amount).toFixed(2)}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">{v.violation_type}</p>
                  </li>
                ))}
            </ul>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
