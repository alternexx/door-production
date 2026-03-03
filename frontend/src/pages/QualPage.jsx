import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api';
import { CheckCircle, AlertTriangle, Loader, ChevronRight, Info } from 'lucide-react';

const TIER_COLORS = { platinum:'#e8e8e8', gold:'#ffd60a', silver:'#94a3b8', bronze:'#ff9f0a', unqualified:'#ff453a' };
const TIER_DESC = {
  platinum:    'Top-tier applicant. Instant approval on any listing.',
  gold:        'Excellent profile. Access to premium listings.',
  silver:      'Good standing. Access to most listings.',
  bronze:      'Qualified with conditions. Limited selection.',
  unqualified: 'Profile needs improvement. Contact support.',
};

export default function QualPage() {
  const { user, qual, setQual } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    id_type: 'drivers_license', id_number: '', dob: '',
    annual_income: '', employer: '', employment_type: 'full-time',
    credit_score_override: '',
    max_rent: '', min_beds: '0', min_baths: '1',
    neighborhoods: [], move_in_date: '', pet_friendly: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [existingQual, setExistingQual] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.getQual().then(({ profile }) => {
      if (profile) {
        setExistingQual(profile);
        setResult({ qual_tier: profile.qual_tier, qual_score: profile.qual_score, credit_score: profile.credit_score, credit_tier: profile.credit_tier, id_verified: profile.id_verified, income_verified: profile.income_verified });
      }
    }).catch(() => {});
  }, []);

  const NEIGHBORHOODS = ['Williamsburg', 'Park Slope', 'Midtown', 'Harlem', 'Astoria', 'Long Island City', 'Lower East Side', 'Financial District', 'Chelsea', 'Brooklyn Heights', 'Crown Heights', 'Bushwick'];

  const toggleNeighborhood = (n) => {
    setForm(f => ({
      ...f,
      neighborhoods: f.neighborhoods.includes(n) ? f.neighborhoods.filter(x => x !== n) : [...f.neighborhoods, n],
    }));
  };

  const submit = async () => {
    setLoading(true); setError('');
    try {
      const data = await api.submitQual({
        ...form,
        annual_income: parseFloat(form.annual_income),
        max_rent: parseFloat(form.max_rent) || null,
        min_beds: parseInt(form.min_beds),
        min_baths: parseFloat(form.min_baths),
        credit_score_override: form.credit_score_override || null,
      });
      setResult(data);
      setQual(data.profile);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 4 && result) {
    const tierColor = TIER_COLORS[result.qual_tier] || '#888';
    const scoreColor = result.qual_score >= 65 ? '#30d158' : result.qual_score >= 45 ? '#ffd60a' : '#ff453a';
    return (
      <div className="fade-in" style={{ maxWidth: 540, margin: '0 auto' }}>
        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{
            width: 100, height: 100, borderRadius: '50%', margin: '0 auto 24px',
            border: `3px solid ${tierColor}`,
            background: `${tierColor}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
          }}>
            {result.qual_score >= 65 ? '🏆' : result.qual_score >= 45 ? '⭐' : '📋'}
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8 }}>
            {result.qual_score >= 65 ? 'You\'re Qualified!' : result.qual_tier === 'unqualified' ? 'Not Yet Qualified' : 'Partially Qualified'}
          </h1>
          <div style={{ marginBottom: 24 }}>
            <span style={{
              padding: '6px 18px', borderRadius: 100, fontSize: 13, fontWeight: 700,
              background: `${tierColor}18`, border: `1px solid ${tierColor}30`,
              color: tierColor, textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {result.qual_tier} tier
            </span>
          </div>
          <p style={{ color: 'rgba(245,245,247,0.5)', fontSize: 15, marginBottom: 36, lineHeight: 1.6 }}>
            {TIER_DESC[result.qual_tier]}
          </p>

          {/* Score breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Qual Score', value: `${Math.round(result.qual_score)}/100`, color: scoreColor },
              { label: 'Credit Score', value: result.credit_score, color: result.credit_score >= 740 ? '#30d158' : result.credit_score >= 670 ? '#ffd60a' : '#ff453a' },
              { label: 'ID Verified',  value: result.id_verified ? '✓ Verified' : '✗ Failed',  color: result.id_verified ? '#30d158' : '#ff453a' },
              { label: 'Income',       value: result.income_verified ? '✓ Verified' : '✗ Failed', color: result.income_verified ? '#30d158' : '#ff453a' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card" style={{ padding: 16, background: 'rgba(255,255,255,0.03)' }}>
                <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.4)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color, letterSpacing: '-0.02em' }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost btn-full" onClick={() => setStep(1)}>
              Re-run Qualification
            </button>
            <a href="/listings" className="btn btn-primary btn-full">
              Browse Listings →
            </a>
          </div>
        </div>
      </div>
    );
  }

  const stepTitles = ['Identity', 'Income', 'Preferences'];
  const isStep1Valid = form.id_type && form.id_number.length >= 6 && form.dob;
  const isStep2Valid = form.annual_income > 0;

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8 }}>
          Get Qualified
        </h1>
        <p style={{ color: 'rgba(245,245,247,0.45)', fontSize: 15 }}>
          Complete in 2 minutes. Instant results.
        </p>
      </div>

      {existingQual && (
        <div style={{
          background: 'rgba(0,113,227,0.08)', border: '1px solid rgba(0,113,227,0.2)',
          borderRadius: 12, padding: '12px 16px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <Info size={15} color="#0071e3" />
          <span style={{ color: 'rgba(245,245,247,0.6)' }}>
            You have an existing {existingQual.qual_tier} qualification. Re-run to update.
          </span>
        </div>
      )}

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36 }}>
        {stepTitles.map((t, i) => {
          const num = i + 1;
          const active = step === num;
          const done   = step > num;
          return (
            <React.Fragment key={t}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: done ? 'pointer' : 'default' }}
                onClick={() => done && setStep(num)}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: done ? '#30d158' : active ? '#0071e3' : 'rgba(255,255,255,0.08)',
                  fontSize: 12, fontWeight: 700,
                  color: done || active ? '#fff' : 'rgba(245,245,247,0.3)',
                }}>
                  {done ? '✓' : num}
                </div>
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#f5f5f7' : 'rgba(245,245,247,0.35)' }}>
                  {t}
                </span>
              </div>
              {i < stepTitles.length - 1 && (
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 12px' }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="card" style={{ padding: 32 }}>
        {step === 1 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginBottom: 4 }}>Identity Verification</h2>
            <div className="form-group">
              <label className="form-label">ID Type</label>
              <select className="form-input" value={form.id_type} onChange={e => set('id_type', e.target.value)}>
                <option value="drivers_license">Driver's License</option>
                <option value="passport">Passport</option>
                <option value="state_id">State ID</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">ID Number</label>
              <input className="form-input" type="text" placeholder="e.g. D12345678" value={form.id_number}
                onChange={e => set('id_number', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <input className="form-input" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
            </div>
            <button className="btn btn-primary btn-full btn-lg" disabled={!isStep1Valid} onClick={() => setStep(2)}>
              Continue <ChevronRight size={18} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginBottom: 4 }}>Income & Employment</h2>
            <div className="form-group">
              <label className="form-label">Annual Income ($)</label>
              <input className="form-input" type="number" placeholder="75000" value={form.annual_income}
                onChange={e => set('annual_income', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Employer / Company</label>
              <input className="form-input" type="text" placeholder="Acme Corp" value={form.employer}
                onChange={e => set('employer', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Employment Type</label>
              <select className="form-input" value={form.employment_type} onChange={e => set('employment_type', e.target.value)}>
                <option value="full-time">Full-Time</option>
                <option value="part-time">Part-Time</option>
                <option value="self-employed">Self-Employed</option>
                <option value="contractor">Contractor</option>
                <option value="unemployed">Other / Unemployed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Credit Score Override (demo only, optional)</label>
              <input className="form-input" type="number" placeholder="750 (leave blank for random)" value={form.credit_score_override}
                onChange={e => set('credit_score_override', e.target.value)} min="300" max="850" />
              <p className="form-hint">In production, this is pulled automatically from credit bureaus.</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-full" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-primary btn-full btn-lg" disabled={!isStep2Valid} onClick={() => setStep(3)}>
                Continue <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em', marginBottom: 4 }}>Rental Preferences</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Max Monthly Rent ($)</label>
                <input className="form-input" type="number" placeholder="3000" value={form.max_rent}
                  onChange={e => set('max_rent', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Min Bedrooms</label>
                <select className="form-input" value={form.min_beds} onChange={e => set('min_beds', e.target.value)}>
                  <option value="0">Studio</option>
                  <option value="1">1 Bedroom</option>
                  <option value="2">2 Bedrooms</option>
                  <option value="3">3+ Bedrooms</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Target Move-In Date</label>
              <input className="form-input" type="date" value={form.move_in_date} onChange={e => set('move_in_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Neighborhoods (pick any)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {NEIGHBORHOODS.map(n => {
                  const selected = form.neighborhoods.includes(n);
                  return (
                    <button key={n} type="button" onClick={() => toggleNeighborhood(n)} style={{
                      padding: '5px 12px', borderRadius: 100, fontSize: 12, fontWeight: 500,
                      border: `1px solid ${selected ? '#0071e3' : 'rgba(255,255,255,0.12)'}`,
                      background: selected ? 'rgba(0,113,227,0.15)' : 'rgba(255,255,255,0.04)',
                      color: selected ? '#0071e3' : 'rgba(245,245,247,0.5)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      {n}
                    </button>
                  );
                })}
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.pet_friendly} onChange={e => set('pet_friendly', e.target.checked)}
                style={{ width: 16, height: 16 }} />
              <span style={{ fontSize: 14, color: 'rgba(245,245,247,0.7)' }}>I have a pet (show pet-friendly listings)</span>
            </label>

            {error && (
              <div style={{ background:'rgba(255,69,58,0.1)', border:'1px solid rgba(255,69,58,0.2)', borderRadius:10, padding:'10px 14px', color:'#ff453a', fontSize:13 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-full" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-primary btn-full btn-lg" disabled={loading} onClick={submit}>
                {loading ? <><div className="spinner spinner-sm" /> Verifying…</> : <>Run Qualification →</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
