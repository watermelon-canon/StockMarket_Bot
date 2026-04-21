import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { BarChart3, Briefcase, Activity, Settings, LogOut, Zap, Search } from 'lucide-react';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './pages/Dashboard';
import Screener from './pages/Screener';
import Portfolio from './pages/Portfolio';
import SettingsPage from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import StockProfile from './components/StockProfile';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: BarChart3 },
  { path: '/screener', label: 'Screener', icon: Search },
  { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function App() {
  const [user, setUser] = useState<{name: string, email: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/auth/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-abyss">
      <Zap className="w-10 h-10 text-accent mb-4 animate-pulse" />
      <span className="text-sm font-mono text-fog tracking-widest uppercase">Initializing Terminal…</span>
    </div>
  );

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={(u) => setUser(u)} />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const handleLogout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
  };

  return (
    <div className="flex h-screen bg-abyss text-snow overflow-hidden terminal-grid">
      <Sidebar user={user} onLogout={handleLogout} />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/screener" element={<Screener />} />
          <Route path="/stock/:ticker" element={<StockProfile />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function Sidebar({ user, onLogout }: { user: { name: string, email: string }, onLogout: () => void }) {
  const location = useLocation();

  return (
    <aside className="w-60 bg-void/80 backdrop-blur-xl border-r border-iron/40 flex flex-col hidden md:flex relative noise">
      {/* Logo */}
      <div className="p-5 pb-4 border-b border-iron/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-mid to-accent-deep flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-[15px] text-white">QUANT</span>
            <span className="font-bold tracking-tight text-[15px] text-accent">PRO</span>
            <div className="text-[9px] font-mono text-smoke tracking-[0.15em] uppercase">Terminal v2.0</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => {
          const active = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          const Icon = item.icon;
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                active
                  ? 'bg-gradient-to-r from-signal-dim to-transparent text-signal font-semibold'
                  : 'text-fog hover:text-snow hover:bg-carbon/60'
              }`}>
              {active && <div className="w-[3px] h-4 rounded-full bg-signal mr-0.5" />}
              <Icon className={`w-4 h-4 ${active ? 'text-signal' : 'text-smoke group-hover:text-mist'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Paper trading banner */}
      <div className="mx-3 mb-3">
        <div className="paper-banner rounded-xl px-3 py-2.5">
          <div className="flex items-center gap-2 mb-0.5">
            <Activity className="w-3 h-3 text-loss" />
            <span className="text-[9px] font-bold text-loss uppercase tracking-widest">Paper Trading</span>
          </div>
          <span className="text-[10px] text-loss/60">Simulated orders only — no real capital at risk</span>
        </div>
      </div>

      {/* User */}
      <div className="p-3 border-t border-iron/30">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="truncate">
            <p className="text-xs font-semibold text-cloud truncate">{user.name}</p>
            <p className="text-[10px] text-smoke truncate">{user.email}</p>
          </div>
          <button onClick={onLogout} className="text-smoke hover:text-loss transition-colors p-1.5 rounded-lg hover:bg-loss-dim">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
