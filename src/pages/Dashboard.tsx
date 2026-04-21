import { useState, useEffect } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Target, Zap, Clock, BarChart3 } from 'lucide-react';

function getMarketStatus() {
  const now = new Date();
  const ny = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const h = ny.getHours(), m = ny.getMinutes(), day = ny.getDay();
  if (day === 0 || day === 6) return { status: 'CLOSED', color: 'text-loss', bg: 'bg-loss', label: 'Weekend — Market Closed' };
  const t = h * 60 + m;
  if (t >= 570 && t < 600) return { status: 'PRE-MARKET', color: 'text-amber', bg: 'bg-amber', label: 'Pre-Market Session' };
  if (t >= 600 && t < 960) return { status: 'OPEN', color: 'text-gain', bg: 'bg-gain', label: 'NYSE / NASDAQ Open' };
  if (t >= 960 && t < 1200) return { status: 'AFTER-HOURS', color: 'text-amber', bg: 'bg-amber', label: 'After-Hours Trading' };
  return { status: 'CLOSED', color: 'text-loss', bg: 'bg-loss', label: 'Market Closed' };
}

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const market = getMarketStatus();

  useEffect(() => {
    Promise.all([
      axios.get('/api/portfolio/summary'),
      axios.get('/api/trade/history'),
    ]).then(([sum, hist]) => {
      setSummary(sum.data);
      setTrades(hist.data.slice(0, 5));
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const equityData = [
    { time: '09:30', equity: 98500 }, { time: '10:00', equity: 99200 },
    { time: '11:00', equity: 99800 }, { time: '12:00', equity: 99400 },
    { time: '13:00', equity: 100200 }, { time: '14:00', equity: 100800 },
    { time: '15:00', equity: summary?.equity || 100000 },
  ];

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <header className="h-16 border-b border-iron/30 bg-obsidian/60 backdrop-blur-xl flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-8">
          <div className="flex flex-col">
            <span className="text-[9px] text-smoke uppercase font-bold tracking-[0.2em]">Total Equity</span>
            <span className="font-mono text-xl font-bold text-white">
              ₹{(summary?.equity || 1000000).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-smoke uppercase font-bold tracking-[0.2em]">Market Status</span>
            <span className={`flex items-center gap-1.5 text-xs font-semibold ${market.color}`}>
              <span className={`w-2 h-2 ${market.bg} rounded-full ${market.status === 'OPEN' ? 'animate-pulse-glow' : ''}`} />
              {market.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="mode-toggle flex">
            <div className="mode-toggle-active px-4 py-1.5 text-xs cursor-pointer">MANUAL</div>
            <div className="px-4 py-1.5 text-xs text-smoke cursor-pointer hover:text-mist transition-colors">AUTO</div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <StatCard icon={TrendingUp} title="Win Rate" value={`${summary?.winRate || 0}%`} accent="gain" />
          <StatCard icon={BarChart3} title="Sharpe Ratio" value="—" accent="signal" />
          <StatCard icon={TrendingDown} title="Realized P&L" value={`₹${(summary?.realizedPnl || 0).toFixed(2)}`}
            accent={(summary?.realizedPnl || 0) >= 0 ? 'gain' : 'loss'} />
          <StatCard icon={Target} title="Open Positions" value={String(summary?.openPositions || 0)} accent="accent" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Equity Curve */}
          <div className="lg:col-span-2 glass-card p-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <h3 className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-accent" /> Equity Curve
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityData}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38d9f5" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38d9f5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" stroke="#333a50" fontSize={10} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                  <YAxis domain={['auto', 'auto']} stroke="#333a50" fontSize={10} tickLine={false} axisLine={false} fontFamily="JetBrains Mono" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f1219', borderColor: '#333a50', borderRadius: 12, color: '#e2e5f0', fontFamily: 'JetBrains Mono', fontSize: 12 }} />
                  <Area type="monotone" dataKey="equity" stroke="#38d9f5" fillOpacity={1} fill="url(#eqGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="glass-card flex flex-col animate-fade-up" style={{ animationDelay: '300ms' }}>
            <div className="p-4 border-b border-iron/30">
              <h3 className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-signal" /> Recent Activity
              </h3>
            </div>
            <div className="p-4 space-y-4 flex-1">
              {trades.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-smoke py-8">
                  No recent trades — start scanning!
                </div>
              ) : (
                trades.map((t: any, i: number) => (
                  <ActivityItem key={i} time={new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    text={`${t.side} ${t.qty} × ${t.ticker} @ ₹${t.entryPrice}`}
                    type={t.side === 'BUY' ? 'success' : 'danger'} />
                ))
              )}
              {trades.length === 0 && (
                <>
                  <ActivityItem time="—" text="Waiting for first signal confirmation…" type="info" />
                  <ActivityItem time="—" text="Connect Alpaca API in Settings to begin" type="info" />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, title, value, accent }: any) {
  const colors: Record<string, string> = {
    gain: 'from-gain-dim to-transparent text-gain border-gain/15',
    loss: 'from-loss-dim to-transparent text-loss border-loss/15',
    signal: 'from-signal-dim to-transparent text-signal border-signal/15',
    accent: 'from-accent-deep/30 to-transparent text-accent border-accent/15',
  };
  return (
    <div className={`glass-card-sm p-5 bg-gradient-to-br ${colors[accent] || colors.signal}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-fog">{title}</span>
      </div>
      <div className="font-mono text-2xl font-bold">{value}</div>
    </div>
  );
}

function ActivityItem({ time, text, type }: any) {
  const dot = type === 'success' ? 'bg-gain' : type === 'danger' ? 'bg-loss' : 'bg-signal';
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2 h-2 rounded-full mt-1.5 ${dot}`} />
        <div className="w-px h-full bg-iron/40 mt-1" />
      </div>
      <div className="pb-3">
        <p className="text-[10px] text-smoke font-mono">{time}</p>
        <p className="text-xs text-cloud mt-0.5">{text}</p>
      </div>
    </div>
  );
}
