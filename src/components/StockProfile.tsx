import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, TrendingUp, TrendingDown, Target, Shield, Zap } from 'lucide-react';
import { createChart, ColorType } from 'lightweight-charts';
import TradeModal from './TradeModal';

const TIMEFRAMES = ['5m', '15m', '30m', '1h', '1d', '1w'];

export default function StockProfile() {
  const { ticker } = useParams<{ ticker: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [score, setScore] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [timeframe, setTimeframe] = useState('1d');
  const [loading, setLoading] = useState(true);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker) return;
    setLoading(true);
    Promise.all([
      axios.get(`/api/stocks/${ticker}/profile`),
      axios.get(`/api/stocks/${ticker}/score`),
      axios.get('/api/auth/me'),
    ]).then(([p, s, me]) => {
      setProfile(p.data);
      setScore(s.data);
      if (me.data?.settings?.watchlist) {
        try {
          const wl = JSON.parse(me.data.settings.watchlist);
          setInWatchlist(wl.includes(ticker));
        } catch {}
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [ticker]);

  useEffect(() => {
    if (!ticker) return;
    axios.get(`/api/stocks/${ticker}/chart?timeframe=${timeframe}`)
      .then(r => {
        if (Array.isArray(r.data) && r.data.length > 0) {
          setChartData(r.data);
        } else {
          setChartData([]);
        }
      })
      .catch(console.error);
  }, [ticker, timeframe]);

  const toggleWatchlist = async () => {
    try {
      const res = await axios.post('/api/user/watchlist', { ticker });
      setInWatchlist(res.data.inWatchlist);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!chartData.length || !chartRef.current) return;
    
    const validData = chartData.filter(d => d.open != null && d.high != null && d.low != null && d.close != null && d.time != null);
    if (validData.length === 0) return;

    chartRef.current.innerHTML = '';
    const chart = createChart(chartRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#0a0c14' }, textColor: '#6b7499', fontFamily: 'JetBrains Mono' },
      grid: { vertLines: { color: '#1c213020' }, horzLines: { color: '#1c213020' } },
      width: chartRef.current.clientWidth || 800, 
      height: chartRef.current.clientHeight || 450,
      timeScale: { timeVisible: true, borderColor: '#1c2130' },
      rightPriceScale: { borderColor: '#1c2130' },
      crosshair: { mode: 0 },
    });
    
    const cs = chart.addCandlestickSeries({
      upColor: '#2dd4a8', downColor: '#f4516c', borderVisible: false,
      wickUpColor: '#2dd4a8', wickDownColor: '#f4516c',
    });
    
    try {
      cs.setData(validData as any);
      
      const vs = chart.addHistogramSeries({
        priceFormat: { type: 'volume' }, priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
      
      vs.setData(validData.map((d: any) => ({
        time: d.time, 
        value: Number(d.volume) || 0, 
        color: d.close >= d.open ? 'rgba(45,212,168,0.15)' : 'rgba(244,81,108,0.15)',
      })) as any);
      
      chart.timeScale().fitContent();
    } catch (err) {
      console.error("Lightweight charts error:", err);
    }
    const ro = new ResizeObserver(() => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    });
    ro.observe(chartRef.current);
    return () => { ro.disconnect(); chart.remove(); };
  }, [chartData]);

  if (loading) return (
    <div className="p-8 space-y-4">
      <div className="skeleton h-12 w-48" />
      <div className="skeleton h-[500px]" />
    </div>
  );

  const p = profile;
  const s = score;
  const signalClass = s?.signal === 'STRONG BUY' ? 'badge-strong-buy' : s?.signal === 'BUY' ? 'badge-buy' : s?.signal === 'HOLD' ? 'badge-hold' : 'badge-avoid';

  const fmtCap = (n: number) => {
    if (!n) return 'N/A';
    if (n >= 1e12) return `₹${(n/1e12).toFixed(2)}T`;
    if (n >= 1e9) return `₹${(n/1e9).toFixed(2)}B`;
    if (n >= 1e6) return `₹${(n/1e6).toFixed(0)}M`;
    return `₹${n}`;
  };

  const indicators = [
    { name: 'EMA Stack (30m)', value: s?.emaTrend30m || '—', signal: s?.stage1Pass ? 'BUY' : 'HOLD', weight: '25/100' },
    { name: 'EMA Stack (5m)', value: s?.emaTrend5m || '—', signal: s?.stage2Pass ? 'BUY' : 'HOLD', weight: '20/100' },
    { name: 'RSI (14)', value: s?.rsi?.toFixed(1) || '—', signal: s?.stage3Pass ? 'BUY' : s?.rsi > 70 ? 'OVERBOUGHT' : 'HOLD', weight: '15/100' },
    { name: 'Stochastic', value: s?.stochK ? `K:${s.stochK}` : '—', signal: s?.stage4Pass ? 'BUY' : 'HOLD', weight: '20/100' },
    { name: 'MACD', value: s?.macdSignal || '—', signal: s?.macdSignal === 'BULLISH' ? 'BUY' : 'HOLD', weight: '5/100' },
    { name: 'Bollinger', value: s?.bbSignal || '—', signal: s?.bbSignal === 'OVERSOLD' ? 'BUY' : s?.bbSignal === 'OVERBOUGHT' ? 'SELL' : 'HOLD', weight: '3/100' },
  ];

  const fundamentals = [
    { label: 'Market Cap', value: fmtCap(p?.marketCap) },
    { label: 'P/E Ratio', value: p?.pe?.toFixed(2) || 'N/A' },
    { label: 'EPS', value: p?.eps ? `₹${p.eps.toFixed(2)}` : 'N/A' },
    { label: 'Debt/Equity', value: p?.debtEquity?.toFixed(2) || 'N/A' },
    { label: 'Dividend Yield', value: p?.dividendYield ? `${(p.dividendYield * 100).toFixed(2)}%` : 'N/A' },
    { label: 'Beta', value: p?.beta?.toFixed(2) || 'N/A' },
    { label: '52W High', value: p?.fiftyTwoWeekHigh ? `₹${p.fiftyTwoWeekHigh.toFixed(2)}` : 'N/A' },
    { label: '52W Low', value: p?.fiftyTwoWeekLow ? `₹${p.fiftyTwoWeekLow.toFixed(2)}` : 'N/A' },
  ];

  const sigColor = (sig: string) => sig === 'BUY' ? 'text-gain' : sig === 'SELL' || sig === 'OVERBOUGHT' ? 'text-loss' : 'text-amber';

  return (
    <div className="p-6 lg:p-8">
      {/* Back header */}
      <header className="flex items-center justify-between mb-6 animate-fade-up">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-fog hover:text-snow text-sm font-semibold transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${signalClass}`}>{s?.signal}</span>
          <span className="text-xs font-mono font-bold text-smoke">Score: {s?.compositeScore}/100</span>
        </div>
      </header>

      {/* Title */}
      <div className="mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-bold text-white font-mono tracking-tight">{ticker}</h1>
          <span className="text-xs bg-carbon border border-iron/40 px-2.5 py-1 rounded-lg text-fog">{p?.sector || 'N/A'}</span>
        </div>
        <p className="text-fog text-sm">{p?.name}</p>
        <div className="flex items-center gap-4 mt-2">
          <span className="font-mono text-3xl font-bold text-white">₹{p?.price?.toFixed(2)}</span>
          <span className={`flex items-center gap-1 text-sm font-bold font-mono ${(p?.change || 0) >= 0 ? 'text-gain' : 'text-loss'}`}>
            {(p?.change || 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {(p?.change || 0) >= 0 ? '+' : ''}{p?.change?.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart */}
        <div className="lg:col-span-8 space-y-4 animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-iron/20">
              <span className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em]">Price Chart</span>
              <div className="flex gap-1 bg-obsidian rounded-lg p-0.5">
                {TIMEFRAMES.map(tf => (
                  <button key={tf} onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-md transition-all uppercase ${timeframe === tf ? 'bg-carbon text-snow' : 'text-smoke hover:text-mist'}`}>
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chartRef} className="w-full h-[450px] bg-abyss" />
          </div>

          {/* Signal Table */}
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b border-iron/20 flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em]">Signal Breakdown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-iron/20 text-smoke">
                    <th className="text-left py-3 px-4 font-semibold">Indicator</th>
                    <th className="text-right py-3 px-4 font-semibold">Value</th>
                    <th className="text-right py-3 px-4 font-semibold">Signal</th>
                    <th className="text-right py-3 px-4 font-semibold">Weight</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {indicators.map((ind, i) => (
                    <tr key={i} className="border-b border-iron/10 hover:bg-carbon/30 transition-colors">
                      <td className="py-3 px-4 text-cloud">{ind.name}</td>
                      <td className="py-3 px-4 text-right text-mist">{ind.value}</td>
                      <td className={`py-3 px-4 text-right font-bold ${sigColor(ind.signal)}`}>{ind.signal}</td>
                      <td className="py-3 px-4 text-right text-smoke">{ind.weight}</td>
                    </tr>
                  ))}
                  <tr className="bg-carbon/20">
                    <td className="py-3 px-4 font-bold text-white">COMPOSITE</td>
                    <td className="py-3 px-4 text-right font-bold text-white">{s?.compositeScore}/100</td>
                    <td className={`py-3 px-4 text-right font-bold ${sigColor(s?.signal === 'STRONG BUY' || s?.signal === 'BUY' ? 'BUY' : 'HOLD')}`}>{s?.signal}</td>
                    <td className="py-3 px-4 text-right text-smoke">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right sidebar: Fundamentals */}
        <div className="lg:col-span-4 space-y-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
          <div className="glass-card p-5">
            <h3 className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-signal" /> Fundamentals
            </h3>
            <div className="space-y-3">
              {fundamentals.map((f, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-xs text-fog">{f.label}</span>
                  <span className="text-xs font-mono font-semibold text-cloud">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Valuation */}
          {s?.intrinsicValue > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <Target className="w-3.5 h-3.5 text-amber" /> Valuation
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-fog">P/E Intrinsic Value</span><span className="text-xs font-mono font-bold text-cloud">₹{s.intrinsicValue}</span></div>
                <div className="flex justify-between"><span className="text-xs text-fog">Margin of Safety</span><span className={`text-xs font-mono font-bold ${s.marginOfSafety > 0 ? 'text-gain' : 'text-loss'}`}>{s.marginOfSafety.toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-xs text-fog">Signal</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${s.valuationSignal === 'UNDERVALUED' ? 'badge-strong-buy' : s.valuationSignal === 'FAIRLY_VALUED' ? 'badge-buy' : 'badge-avoid'}`}>
                    {s.valuationSignal}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Trade actions */}
          <div className="glass-card p-5 space-y-3">
            <h3 className="text-[10px] font-bold text-smoke uppercase tracking-[0.2em] mb-2">Quick Actions</h3>
            <button className="btn-gain w-full text-sm" onClick={() => setShowTradeModal(true)}>Trade {ticker}</button>
            <button className={`w-full text-sm font-bold py-3 rounded-xl transition-colors ${inWatchlist ? 'bg-carbon text-white border border-iron/20' : 'btn-ghost'}`} onClick={toggleWatchlist}>
              {inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist'}
            </button>
          </div>
        </div>
      </div>
      
      {showTradeModal && (
        <TradeModal 
          ticker={ticker!} 
          currentPrice={p?.price || 0} 
          isOpen={showTradeModal} 
          onClose={() => setShowTradeModal(false)} 
        />
      )}
    </div>
  );
}
