import { useState } from 'react';
import { ShieldCheck, SearchCheck, ArrowUpRight, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { SectionCard, Spinner, StatusDot, EmptyState } from '@/components/ui';
import { useToast } from '@/components/Toast';
import { useQuery } from '@/lib/useQuery';
import { fetchTransactions, verifyTransaction, shortHash, type OnChainTransaction, type VerifyResult } from '@/lib/api';

const KIND_ICON: Record<OnChainTransaction['kind'], typeof CheckCircle2> = {
  reservation: CheckCircle2,
  cancellation: XCircle,
  violation: ShieldCheck,
  payment: ArrowUpRight,
};

const KIND_STYLE: Record<OnChainTransaction['kind'], string> = {
  reservation: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  cancellation: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  violation: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  payment: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
};

export default function TransactionsView() {
  const { notify } = useToast();
  const { data: transactions, isLoading, error, refetch } = useQuery(fetchTransactions, ['transactions']);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, VerifyResult>>({});
  const [filter, setFilter] = useState<'all' | OnChainTransaction['kind']>('all');

  const list = (transactions ?? []).filter((t) => filter === 'all' || t.kind === filter);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Blockchain Transaction History"
        subtitle="On-chain records for reservations, cancellations, violations, and fine payments"
        action={
          <div className="flex items-center gap-2">
            <select
              className="input w-auto py-1.5 text-xs"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">All types</option>
              <option value="reservation">Reservations</option>
              <option value="cancellation">Cancellations</option>
              <option value="violation">Violations</option>
              <option value="payment">Payments</option>
            </select>
            <button className="btn-ghost text-xs" onClick={() => refetch()}>
              Refresh
            </button>
          </div>
        }
      >
        {isLoading ? (
          <Spinner label="Loading transactions…" />
        ) : error ? (
          <p className="text-sm text-rose-300">{(error as Error).message}</p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-8 w-8 text-slate-600" />}
            message="No blockchain transactions recorded yet. Make a reservation or record a violation to see on-chain activity."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr className="border-b border-navy-800">
                  <th className="py-2.5 pr-4 font-medium">Type</th>
                  <th className="py-2.5 pr-4 font-medium">Transaction Hash</th>
                  <th className="py-2.5 pr-4 font-medium">Status</th>
                  <th className="py-2.5 pr-4 font-medium">Block</th>
                  <th className="py-2.5 pr-4 font-medium">From → To</th>
                  <th className="py-2.5 pr-4 font-medium">Time</th>
                  <th className="py-2.5 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-800/70">
                {list.map((t) => {
                  const Icon = KIND_ICON[t.kind];
                  const res = results[t.tx_hash];
                  return (
                    <tr key={t.id} className="table-row-hover align-top">
                      <td className="py-3 pr-4">
                        <span className={`chip border ${KIND_STYLE[t.kind]}`}>
                          <Icon className="h-3.5 w-3.5" /> {t.kind}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="font-mono text-xs text-slate-200" title={t.tx_hash}>
                          {shortHash(t.tx_hash)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2 text-xs capitalize">
                          <StatusDot status={t.status} /> {t.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono text-xs text-slate-400">{t.block_number ?? '—'}</td>
                      <td className="py-3 pr-4 font-mono text-[11px] text-slate-500">
                        {t.from_address ? shortHash(t.from_address) : '—'}
                        <span className="mx-1">→</span>
                        {t.to_address ? shortHash(t.to_address) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-xs text-slate-400">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 pr-4">
                        <button
                          className="btn-ghost px-2.5 py-1.5 text-xs"
                          disabled={verifying === t.tx_hash}
                          onClick={async () => {
                            setVerifying(t.tx_hash);
                            try {
                              const r = await verifyTransaction(t.tx_hash);
                              setResults((prev) => ({ ...prev, [t.tx_hash]: r }));
                              notify(
                                r.verified
                                  ? `Verified on chain: ${r.message}`
                                  : `Verification: ${r.message}`,
                                r.verified ? 'success' : 'warning',
                              );
                            } catch (e) {
                              notify(`Verification failed: ${(e as Error).message}`, 'error');
                            } finally {
                              setVerifying(null);
                            }
                          }}
                        >
                          {verifying === t.tx_hash ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin-slow" />
                          ) : (
                            <SearchCheck className="h-3.5 w-3.5" />
                          )}
                          Verify
                        </button>
                        {res && (
                          <div
                            className={`mt-2 rounded border px-2.5 py-1.5 text-[11px] ${
                              res.verified
                                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200'
                                : 'border-amber-500/40 bg-amber-950/40 text-amber-200'
                            }`}
                          >
                            {res.message}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
