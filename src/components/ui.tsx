import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function StatCard({
  label,
  value,
  icon,
  accent = 'teal',
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: 'teal' | 'amber' | 'rose' | 'emerald' | 'navy';
  hint?: string;
}) {
  const accents: Record<string, string> = {
    teal: 'text-teal-300 bg-teal-500/10 border-teal-500/20',
    amber: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-300 bg-rose-500/10 border-rose-500/20',
    emerald: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    navy: 'text-navy-300 bg-navy-600/20 border-navy-600/40',
  };
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${accents[accent]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children, className = '' }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-navy-800/80 px-5 py-4">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-slate-400">
      <Loader2 className="h-5 w-5 animate-spin-slow text-teal-400" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

export function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: 'bg-emerald-400',
    pending: 'bg-amber-400',
    failed: 'bg-rose-400',
    active: 'bg-teal-400',
    cancelled: 'bg-slate-500',
    available: 'bg-emerald-400',
    reserved: 'bg-amber-400',
    occupied: 'bg-rose-400',
    maintenance: 'bg-slate-500',
  };
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${map[status] ?? 'bg-slate-400'}`} />;
}

export function EmptyState({ icon, message }: { icon?: ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center text-slate-500">
      {icon}
      <p className="text-sm">{message}</p>
    </div>
  );
}
