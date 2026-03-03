import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'tenant', phone: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register({ email: form.email, password: form.password, role: form.role, full_name: form.full_name, phone: form.phone });
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#000', padding: 24, position: 'relative', overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(ellipse, rgba(0,113,227,0.08) 0%, transparent 70%)',
      }} />

      <div className="fade-in" style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'linear-gradient(135deg, #0071e3 0%, #30d158 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(0,113,227,0.35)',
          }}>🚪</div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8 }}>DOOR</h1>
          <p style={{ color: 'rgba(245,245,247,0.45)', fontSize: 15 }}>
            Same-day rental. Verified instantly.
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: 32 }}>
          {/* Mode tabs */}
          <div className="tabs" style={{ marginBottom: 28 }}>
            {['login', 'register'].map(m => (
              <button key={m} className={`tab ${mode === m ? 'active' : ''}`} onClick={() => { setMode(m); setError(''); }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'register' && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" type="text" placeholder="Jane Smith" value={form.full_name}
                    onChange={e => set('full_name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">I am a</label>
                  <select className="form-input" value={form.role} onChange={e => set('role', e.target.value)}>
                    <option value="tenant">Tenant — Looking to rent</option>
                    <option value="owner">Owner — I have property to list</option>
                    <option value="broker">Broker — I represent clients</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone (optional)</label>
                  <input className="form-input" type="tel" placeholder="+1 (212) 555-0100" value={form.phone}
                    onChange={e => set('phone', e.target.value)} />
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="jane@example.com" value={form.email}
                onChange={e => set('email', e.target.value)} required autoComplete="email" />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="form-input" type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'register' ? 'Min 8 characters' : 'Your password'}
                  value={form.password} onChange={e => set('password', e.target.value)}
                  required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: 48 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(245,245,247,0.4)',
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)',
                borderRadius: 10, padding: '10px 14px', color: '#ff453a', fontSize: 13,
              }}>{error}</div>
            )}

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading
                ? <><div className="spinner spinner-sm" /> Processing…</>
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>
              }
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(245,245,247,0.3)', marginTop: 20 }}>
          DOOR · NYC Real Estate Platform · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
