import { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, ArrowUpRight, TrendingDown } from 'lucide-react';

export default function Portfolio() {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/portfolio/positions')
      .then(res => setPositions(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalValue = positions.reduce((acc, pos) => acc + (pos.current || pos.entryPrice) * pos.qty, 0);
  const totalCost = positions.reduce((acc, pos) => acc + pos.entryPrice * pos.qty, 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-8 animate-fade-up">
        <h2 className="text-2xl font-bold text-white tracking-tight">Portfolio</h2>
        <p className="text-sm text-fog mt-1">Manage your active positions and performance</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 stagger-children">
        <div className="glass-card-sm p-5 border-l-4 border-accent">
          <div className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5" /> Total Value
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            ₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className={`glass-card-sm p-5 border-l-4 ${totalPnl >= 0 ? 'border-gain' : 'border-loss'}`}>
          <div className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em] mb-2">Unrealized P&L</div>
          <div className={`font-mono text-2xl font-bold flex items-center gap-2 ${totalPnl >= 0 ? 'text-gain' : 'text-loss'}`}>
            {totalPnl >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            ₹{Math.abs(totalPnl).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div className={`glass-card-sm p-5 border-l-4 ${totalPnlPct >= 0 ? 'border-gain' : 'border-loss'}`}>
          <div className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em] mb-2">Return %</div>
          <div className={`font-mono text-2xl font-bold ${totalPnlPct >= 0 ? 'text-gain' : 'text-loss'}`}>
            {totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%
          </div>
        </div>
      </div>

      {/* Positions Table */}
      <div className="glass-card overflow-hidden animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="p-5 border-b border-iron/20">
          <h3 className="text-sm font-bold text-white">Active Positions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-obsidian border-b border-iron/20">
                <th className="px-5 py-3 text-[10px] font-bold text-smoke uppercase tracking-wider">Asset</th>
                <th className="px-5 py-3 text-[10px] font-bold text-smoke uppercase tracking-wider">Qty</th>
                <th className="px-5 py-3 text-[10px] font-bold text-smoke uppercase tracking-wider">Avg Cost</th>
                <th className="px-5 py-3 text-[10px] font-bold text-smoke uppercase tracking-wider">Market Price</th>
                <th className="px-5 py-3 text-[10px] font-bold text-smoke uppercase tracking-wider">Total Value</th>
                <th className="px-5 py-3 text-[10px] font-bold text-smoke uppercase tracking-wider">P&L (₹)</th>
                <th className="px-5 py-3 text-[10px] font-bold text-smoke uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-fog">Loading positions...</td></tr>
              ) : positions.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-fog">No active positions.</td></tr>
              ) : (
                positions.map((pos) => {
                  const currentPrice = pos.current || pos.entryPrice; // Mocked fallback
                  const value = currentPrice * pos.qty;
                  const cost = pos.entryPrice * pos.qty;
                  const pnl = value - cost;
                  const pnlPct = (pnl / cost) * 100;
                  return (
                    <tr key={pos.id} className="border-b border-iron/10 hover:bg-carbon/30 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${pos.side === 'BUY' ? 'bg-gain' : 'bg-loss'}`} />
                          {pos.ticker}
                        </div>
                        <div className="text-[10px] text-fog mt-0.5">{pos.side}</div>
                      </td>
                      <td className="px-5 py-4 font-mono text-cloud">{pos.qty}</td>
                      <td className="px-5 py-4 font-mono text-cloud">₹{pos.entryPrice.toFixed(2)}</td>
                      <td className="px-5 py-4 font-mono text-cloud">₹{currentPrice.toFixed(2)}</td>
                      <td className="px-5 py-4 font-mono font-bold text-white">₹{value.toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <div className={`font-mono font-bold ${pnl >= 0 ? 'text-gain' : 'text-loss'}`}>
                          {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                        </div>
                        <div className={`font-mono text-[10px] ${pnlPct >= 0 ? 'text-gain' : 'text-loss'}`}>
                          {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button className="btn-ghost text-xs px-3 py-1.5">Close</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
