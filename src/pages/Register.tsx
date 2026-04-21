import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Zap, Eye, EyeOff, Check, X } from 'lucide-react';

function getStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong'];
const STRENGTH_COLORS = ['bg-loss', 'bg-amber', 'bg-signal', 'bg-gain'];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const strength = getStrength(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('Passwords do not match');
    if (strength < 2) return setError('Password too weak — use uppercase, numbers, and symbols');
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/register', { name, email, password });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-void relative overflow-hidden">
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-signal-dim/30 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] bg-gain-dim/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="glass-card p-8 animate-fade-up noise relative overflow-hidden">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gain to-accent-mid flex items-center justify-center mb-4 shadow-lg shadow-gain-dim/50">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Account</h1>
            <p className="text-sm text-fog mt-1">Start your algorithmic trading journey</p>
          </div>

          {error && <div className="mb-5 px-4 py-3 rounded-xl bg-loss-dim border border-loss/20 text-loss text-sm animate-fade-in">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-fog mb-2 uppercase tracking-wider">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required className="input-field" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-fog mb-2 uppercase tracking-wider">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" placeholder="trader@quantpro.io" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-fog mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required className="input-field pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-smoke hover:text-mist transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[0,1,2,3].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < strength ? STRENGTH_COLORS[strength-1] : 'bg-iron'}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-mono ${strength < 2 ? 'text-loss' : strength < 3 ? 'text-amber' : 'text-gain'}`}>
                    {STRENGTH_LABELS[strength - 1] || 'Too short'}
                  </span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-fog mb-2 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="input-field pr-10" placeholder="••••••••" />
                {confirm.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {passwordsMatch ? <Check className="w-4 h-4 text-gain" /> : <X className="w-4 h-4 text-loss" />}
                  </span>
                )}
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-[15px] mt-2 disabled:opacity-50">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-fog">
            Already have an account?{' '}
            <Link to="/login" className="text-accent hover:text-accent-mid font-semibold transition-colors">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
