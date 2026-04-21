import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, Eye, EyeOff } from 'lucide-react';

export default function Login({ onLogin }: { onLogin: (u: any) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await (await import('axios')).default.post('/api/auth/login', { email, password });
      onLogin(res.data);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-accent-deep/20 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-signal-dim/30 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass-card p-8 animate-fade-up noise relative overflow-hidden">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-mid to-signal flex items-center justify-center mb-4 shadow-lg shadow-accent-deep/30">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Welcome back</h1>
            <p className="text-sm text-fog mt-1">Sign in to your trading terminal</p>
          </div>

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-loss-dim border border-loss/20 text-loss text-sm animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-fog mb-2 uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="input-field" placeholder="trader@quantpro.io" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-fog mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                  className="input-field pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-mist transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-iron bg-obsidian accent-accent" />
              <span className="text-sm text-fog">Remember me</span>
            </label>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-fog">
            New to QuantPro?{' '}
            <Link to="/register" className="text-accent hover:text-accent-mid font-semibold transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
