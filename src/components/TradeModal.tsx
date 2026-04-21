import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface TradeModalProps {
  ticker: string;
  currentPrice: number;
  isOpen: boolean;
  onClose: () => void;
  initialSide?: 'BUY' | 'SELL';
}

export default function TradeModal({ ticker, currentPrice, isOpen, onClose, initialSide = 'BUY' }: TradeModalProps) {
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialSide);
  const [qty, setQty] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  if (!isOpen) return null;

  useEffect(() => {
    if (isOpen) setSide(initialSide);
  }, [isOpen, initialSide]);

  const totalValue = (typeof qty === 'number' ? qty : 0) * currentPrice;

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qty || qty <= 0) return;
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      await axios.post(`/api/trade/${side.toLowerCase()}`, {
        ticker,
        qty: Number(qty),
        price: currentPrice,
        orderType: 'MARKET'
      });
      setMessage({ text: `${side} order filled (Paper)`, type: 'success' });
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Trade failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-card w-full max-w-md overflow-hidden relative noise animate-fade-up">
        {/* Header */}
        <div className="p-5 border-b border-iron/20 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">Trade {ticker}</h3>
            <p className="text-xs text-fog mt-0.5">Paper Trading Account</p>
          </div>
          <button onClick={onClose} className="text-smoke hover:text-white transition-colors p-1 rounded-lg hover:bg-carbon">
            <X className="w-5 h-5" />
          </button>
        </div>

        {message.text && (
          <div className={`mx-5 mt-5 p-3 rounded-lg border text-sm ${message.type === 'success' ? 'bg-gain-dim border-gain/30 text-gain' : 'bg-loss-dim border-loss/30 text-loss'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleTrade} className="p-5 space-y-5">
          {/* Side Toggle */}
          <div className="flex bg-obsidian rounded-xl p-1 border border-iron/40">
            <button type="button" onClick={() => setSide('BUY')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${side === 'BUY' ? 'bg-gain text-gain-dim shadow-lg shadow-gain/20' : 'text-smoke hover:text-mist'}`}>
              <TrendingUp className="w-3.5 h-3.5" /> BUY
            </button>
            <button type="button" onClick={() => setSide('SELL')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all ${side === 'SELL' ? 'bg-loss text-white shadow-lg shadow-loss/20' : 'text-smoke hover:text-mist'}`}>
              <TrendingDown className="w-3.5 h-3.5" /> SELL
            </button>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-bold text-smoke uppercase tracking-wider">Market Price</label>
              <div className="font-mono font-bold text-white text-lg">₹{currentPrice?.toFixed(2)}</div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">Quantity (Shares)</label>
              <input type="number" min="1" step="1" value={qty} onChange={e => setQty(e.target.value === '' ? '' : Number(e.target.value))} required
                className="input-field text-lg font-mono text-center" placeholder="0" />
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-iron/20 mt-2">
              <span className="text-xs text-fog">Estimated Total</span>
              <span className="font-mono font-bold text-accent">₹{totalValue.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-signal-dim/30 border border-signal/20 rounded-xl p-3 flex gap-3 mt-4">
            <Info className="w-4 h-4 text-signal shrink-0 mt-0.5" />
            <p className="text-[10px] text-cloud leading-relaxed">
              This is a paper trade executed at the current mock market price. No real capital is used.
            </p>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading || !qty || qty <= 0}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${side === 'BUY' ? 'bg-gain text-gain-dim hover:bg-gain/90' : 'bg-loss text-white hover:bg-loss/90'}`}>
            {loading ? 'Processing...' : `Confirm ${side}`}
          </button>
        </form>
      </div>
    </div>
  );
}
