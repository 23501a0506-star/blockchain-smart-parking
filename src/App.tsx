import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  CircleParking,
  ShieldAlert,
  Boxes,
  Link2,
  Menu,
  X,
  Github,
} from 'lucide-react';
import { ToastProvider } from '@/components/Toast';
import DashboardView from '@/views/DashboardView';
import ReservationView from '@/views/ReservationView';
import ViolationsView from '@/views/ViolationsView';
import TransactionsView from '@/views/TransactionsView';

type Tab = 'dashboard' | 'reservations' | 'violations' | 'transactions';

const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reservations', label: 'Reservations', icon: CircleParking },
  { id: 'violations', label: 'Violations', icon: ShieldAlert },
  { id: 'transactions', label: 'Blockchain', icon: Boxes },
];

function App() {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [tab]);

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-navy-800 bg-navy-900/95 backdrop-blur transition-transform lg:static lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-16 items-center gap-2 border-b border-navy-800 px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-teal-400 to-teal-600 text-navy-950">
              <Link2 className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight text-white">ParkChain</p>
              <p className="text-[11px] text-slate-400">Smart Parking on Blockchain</p>
            </div>
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? 'bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/30'
                      : 'text-slate-400 hover:bg-navy-800 hover:text-slate-200'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-auto p-4">
            <div className="rounded-lg border border-navy-800 bg-navy-950/50 p-3 text-xs text-slate-400">
              <p className="mb-1 font-semibold text-slate-300">Network</p>
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 pulse-ring" />
                Ethereum Local (Hardhat)
              </p>
              <p className="mt-2 text-slate-500">Solidity + ethers.js + SQLite</p>
            </div>
          </div>
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
        )}

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-navy-800 bg-navy-950/80 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-3">
              <button
                className="btn-ghost p-2 lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div>
                <h1 className="text-lg font-semibold capitalize text-white">
                  {NAV.find((n) => n.id === tab)?.label}
                </h1>
                <p className="text-xs text-slate-400">Blockchain-Based Smart Parking & Violation Management</p>
              </div>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 rounded-lg border border-navy-700 px-3 py-2 text-xs text-slate-300 hover:bg-navy-800 sm:flex"
            >
              <Github className="h-4 w-4" /> Project Repository
            </a>
          </header>

          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {tab === 'dashboard' && <DashboardView onNavigate={(t) => setTab(t as Tab)} />}
            {tab === 'reservations' && <ReservationView />}
            {tab === 'violations' && <ViolationsView />}
            {tab === 'transactions' && <TransactionsView />}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
