import { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Link, Shield, Sliders, Bell } from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState<any>({
    alpacaKey: '',
    alpacaSecret: '',
    alpacaEndpoint: 'https://paper-api.alpaca.markets',
    autoTradingEnabled: false,
    maxPositions: 5,
    maxEquityPerTrade: 500000,
    stopLossPct: 5,
    takeProfitPct: 15,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    axios.get('/api/auth/me')
      .then(res => {
        if (res.data.settings) {
          setSettings(prev => ({ ...prev, ...res.data.settings }));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === 'checkbox') finalValue = (e.target as HTMLInputElement).checked;
    else if (type === 'number') finalValue = parseFloat(value) || 0;
    setSettings({ ...settings, [name]: finalValue });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      await axios.put('/api/user/settings', settings);
      setMessage({ text: 'Settings saved successfully', type: 'success' });
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Failed to save', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-smoke">Loading settings...</div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <header className="mb-8 flex justify-between items-center animate-fade-up">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
          <p className="text-sm text-fog mt-1">Configure trading preferences and API keys</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>

      {message.text && (
        <div className={`mb-6 p-4 rounded-xl border animate-fade-in ${message.type === 'success' ? 'bg-gain-dim border-gain/30 text-gain' : 'bg-loss-dim border-loss/30 text-loss'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
        {/* Alpaca API Group */}
        <section className="glass-card p-6">
          <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <Link className="w-4 h-4 text-accent" /> Broker Integration (Alpaca)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">API Key</label>
              <input type="text" name="alpacaKey" value={settings.alpacaKey || ''} onChange={handleChange} className="input-field font-mono" placeholder="PK..." />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">Secret Key</label>
              <input type="password" name="alpacaSecret" value={settings.alpacaSecret || ''} onChange={handleChange} className="input-field font-mono" placeholder="••••••••" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">Endpoint</label>
              <select name="alpacaEndpoint" value={settings.alpacaEndpoint || ''} onChange={handleChange} className="input-field">
                <option value="https://paper-api.alpaca.markets">Paper Trading (https://paper-api.alpaca.markets)</option>
                <option value="https://api.alpaca.markets">Live Trading (https://api.alpaca.markets)</option>
              </select>
            </div>
          </div>
        </section>

        {/* Risk Management */}
        <section className="glass-card p-6">
          <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-signal" /> Risk Management
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">Max Positions</label>
              <input type="number" name="maxPositions" value={settings.maxPositions} onChange={handleChange} className="input-field" min="1" max="20" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">Max Equity Per Trade (₹)</label>
              <input type="number" name="maxEquityPerTrade" value={settings.maxEquityPerTrade} onChange={handleChange} className="input-field" step="1000" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">Stop Loss (%)</label>
              <input type="number" name="stopLossPct" value={settings.stopLossPct} onChange={handleChange} className="input-field" step="0.5" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-smoke uppercase tracking-wider mb-2">Take Profit (%)</label>
              <input type="number" name="takeProfitPct" value={settings.takeProfitPct} onChange={handleChange} className="input-field" step="0.5" />
            </div>
          </div>
        </section>

        {/* Automation Settings */}
        <section className="glass-card p-6">
          <h3 className="text-sm font-bold text-white mb-5 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber" /> Automation
          </h3>
          <label className="flex items-center justify-between p-4 bg-obsidian border border-iron/30 rounded-xl cursor-pointer hover:bg-carbon/50 transition-colors">
            <div>
              <div className="text-sm font-bold text-white">Enable Auto Trading</div>
              <div className="text-xs text-fog mt-1">Bot will automatically execute trades based on strong signals</div>
            </div>
            <div className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" name="autoTradingEnabled" checked={settings.autoTradingEnabled} onChange={handleChange} className="sr-only peer" />
              <div className="w-11 h-6 bg-iron rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gain"></div>
            </div>
          </label>
        </section>
      </div>
    </div>
  );
}
