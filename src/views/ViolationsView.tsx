import { useState } from 'react';
import { ShieldAlert, Plus, BadgeCheck, Coins } from 'lucide-react';
import { SectionCard, Spinner, StatusDot } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useQuery } from '@/lib/useQuery';
import { createViolation, fetchViolations, payViolation } from '@/lib/api';

const VIOLATION_TYPES = [
  'Overstay',
  'Invalid Slot',
  'No Payment',
  'Blocked Exit',
  'Double Parking',
  'Expired Permit',
];

export default function ViolationsView() {
  const { notify } = useToast();
  const { data: violations, isLoading, error, refetch } = useQuery(fetchViolations, ['violations']);
  const [form, setForm] = useState({
    vehicle_reg: '',
    violation_type: VIOLATION_TYPES[0],
    description: '',
    fine_amount: 50,
  });
  const [submitting, setSubmitting] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const list = violations ?? [];
  const unpaid = list.filter((v) => !v.paid);
  const paid = list.filter((v) => v.paid);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Record a Violation" subtitle="Issue a fine to a vehicle" className="lg:col-span-1">
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!form.vehicle_reg.trim() || !form.description.trim() || form.fine_amount <= 0) {
                notify('Please complete all fields with a positive fine amount.', 'warning');
                return;
              }
              setSubmitting(true);
              try {
                await createViolation(form);
                notify(`Violation recorded for ${form.vehicle_reg}. On-chain violation entry created.`, 'success');
                setForm({ vehicle_reg: '', violation_type: VIOLATION_TYPES[0], description: '', fine_amount: 50 });
                refetch();
              } catch (e) {
                notify(`Failed: ${(e as Error).message}`, 'error');
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <div>
              <label className="label">Vehicle Registration</label>
              <input
                className="input font-mono uppercase"
                placeholder="ABC-1234"
                value={form.vehicle_reg}
                onChange={(e) => setForm({ ...form, vehicle_reg: e.target.value.toUpperCase() })}
                required
              />
            </div>
            <div>
              <label className="label">Violation Type</label>
              <select
                className="input"
                value={form.violation_type}
                onChange={(e) => setForm({ ...form, violation_type: e.target.value })}
              >
                {VIOLATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="Describe what happened…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Fine Amount (USD)</label>
              <input
                type="number"
                min={1}
                step={1}
                className="input"
                value={form.fine_amount}
                onChange={(e) => setForm({ ...form, fine_amount: Number(e.target.value) })}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              <Plus className="h-4 w-4" /> {submitting ? 'Recording…' : 'Record Violation'}
            </button>
          </form>
        </SectionCard>

        <div className="space-y-6 lg:col-span-2">
          <SectionCard title="Unpaid Fines" subtitle={`${unpaid.length} outstanding`}>
            {isLoading ? (
              <Spinner label="Loading violations…" />
            ) : error ? (
              <p className="text-sm text-rose-300">{(error as Error).message}</p>
            ) : unpaid.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No unpaid fines. All clear.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr className="border-b border-navy-800">
                      <th className="py-2 pr-4 font-medium">Vehicle</th>
                      <th className="py-2 pr-4 font-medium">Type</th>
                      <th className="py-2 pr-4 font-medium">Fine</th>
                      <th className="py-2 pr-4 font-medium">Recorded</th>
                      <th className="py-2 pr-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-800/70">
                    {unpaid.map((v) => (
                      <tr key={v.id} className="table-row-hover">
                        <td className="py-2.5 pr-4 font-mono text-amber-200">{v.vehicle_reg}</td>
                        <td className="py-2.5 pr-4">
                          <span className="chip bg-amber-500/10 text-amber-300">{v.violation_type}</span>
                        </td>
                        <td className="py-2.5 pr-4 font-semibold text-white">
                          ${Number(v.fine_amount).toFixed(2)}
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-slate-400">
                          {new Date(v.created_at).toLocaleString()}
                        </td>
                        <td className="py-2.5 pr-4">
                          <button
                            className="btn-primary px-3 py-1.5 text-xs"
                            disabled={payingId === v.id}
                            onClick={async () => {
                              setPayingId(v.id);
                              try {
                                await payViolation(v.id);
                                notify(`Fine for ${v.vehicle_reg} marked paid. Payment recorded on chain.`, 'success');
                                refetch();
                              } catch (e) {
                                notify(`Payment failed: ${(e as Error).message}`, 'error');
                              } finally {
                                setPayingId(null);
                              }
                            }}
                          >
                            {payingId === v.id ? <SpinnerMini /> : <Coins className="h-3.5 w-3.5" />}
                            Mark Paid
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Paid Fines" subtitle={`${paid.length} settled`}>
            {paid.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No paid fines yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr className="border-b border-navy-800">
                      <th className="py-2 pr-4 font-medium">Vehicle</th>
                      <th className="py-2 pr-4 font-medium">Type</th>
                      <th className="py-2 pr-4 font-medium">Fine</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-800/70">
                    {paid.map((v) => (
                      <tr key={v.id} className="table-row-hover">
                        <td className="py-2.5 pr-4 font-mono text-emerald-200">{v.vehicle_reg}</td>
                        <td className="py-2.5 pr-4 text-slate-300">{v.violation_type}</td>
                        <td className="py-2.5 pr-4 text-slate-300">${Number(v.fine_amount).toFixed(2)}</td>
                        <td className="py-2.5 pr-4">
                          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-300">
                            <BadgeCheck className="h-4 w-4" /> Paid
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SpinnerMini() {
  return (
    <span className="inline-flex items-center">
      <ShieldAlert className="mr-1 h-3.5 w-3.5 animate-pulse" />
    </span>
  );
}

// keep StatusDot import referenced for tree-shaking friendliness
export const _unused = StatusDot;
