import { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw, TrendingUp, ArrowUpRight, Filter, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function signalBadge(signal: string) {
  const map: Record<string, string> = {
    'STRONG BUY': 'badge-strong-buy', 'BUY': 'badge-buy', 'HOLD': 'badge-hold', 'AVOID': 'badge-avoid',
  };
  return map[signal] || 'badge-hold';
}

export default function Screener() {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/stocks/suggestions');
      setSuggestions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSuggestions(); }, []);

  const filtered = filter === 'ALL' ? suggestions
    : filter === 'STRONG' ? suggestions.filter(s => s.compositeScore >= 75)
    : filter === 'BUY' ? suggestions.filter(s => s.compositeScore >= 50 && s.compositeScore < 75)
    : suggestions.filter(s => s.compositeScore < 50);

  return (
    <div className="p-6 lg:p-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-fade-up">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Signal Engine</h2>
          <p className="text-sm text-fog mt-1">Real-time composite analysis across your watchlist</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-obsidian border border-iron/40 rounded-xl p-1">
            {['ALL', 'STRONG', 'BUY', 'HOLD'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all uppercase tracking-wider ${filter === f ? 'bg-carbon text-snow' : 'text-smoke hover:text-mist'}`}>
                {f}
              </button>
            ))}
          </div>
          <button onClick={fetchSuggestions} disabled={loading}
            className="btn-ghost flex items-center gap-2 text-xs disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Rescan
          </button>
        </div>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-56 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-smoke">
          <Filter className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No stocks match this filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 stagger-children">
          {filtered.map(s => (
            <SuggestionCard key={s.ticker} stock={s} onClick={() => navigate(`/stock/${s.ticker}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestionCard({ stock, onClick }: { stock: any, onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="glass-card p-5 cursor-pointer group hover:border-accent/30 transition-all duration-300 relative overflow-hidden">
      {/* Score badge */}
      <div className={`absolute top-0 right-0 px-3 py-1.5 text-[10px] font-bold font-mono rounded-bl-xl ${signalBadge(stock.signal)}`}>
        {stock.compositeScore}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-carbon border border-iron/40 flex items-center justify-center text-white font-bold font-mono text-sm">
          {stock.ticker.substring(0, 2)}
        </div>
        <div>
          <div className="text-sm font-bold text-white group-hover:text-accent transition-colors">{stock.ticker}</div>
          <div className="text-[10px] text-smoke truncate max-w-[140px]">{stock.name}</div>
        </div>
      </div>

      {/* Price */}
      <div className="flex justify-between items-end mb-4 pb-4 border-b border-iron/20">
        <span className="font-mono text-xl font-bold text-white">₹{stock.price?.toFixed(2)}</span>
        <span className={`flex items-center gap-0.5 text-xs font-bold font-mono ${stock.change >= 0 ? 'text-gain' : 'text-loss'}`}>
          {stock.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
          {stock.change >= 0 ? '+' : ''}{stock.change?.toFixed(2)}%
        </span>
      </div>

      {/* Reasons */}
      <div className="space-y-1.5 mb-4">
        {(stock.reasons || []).slice(0, 3).map((r: string, i: number) => (
          <div key={i} className="text-[11px] text-fog leading-relaxed flex gap-2">
            <span className="text-accent mt-0.5 shrink-0">›</span>
            <span>{r}</span>
          </div>
        ))}
      </div>

      {/* Signal + action */}
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${signalBadge(stock.signal)}`}>
          {stock.signal}
        </span>
        <span className="text-[10px] text-smoke group-hover:text-accent flex items-center gap-1 transition-colors">
          Details <ChevronRight className="w-3 h-3" />
        </span>
      </div>
    </div>
  );
}
