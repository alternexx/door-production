import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../lib/api';
import { ArrowRight, Home, CheckCircle, BookOpen, FileText, Zap, TrendingUp } from 'lucide-react';

const TIER_COLORS = {
  platinum:'#e8e8e8', gold:'#ffd60a', silver:'#94a3b8', bronze:'#ff9f0a', unqualified:'#ff453a',
};
const TIER_LABELS = {
  platinum:'Platinum Member', gold:'Gold Member', silver:'Silver Member',
  bronze:'Bronze Member', unqualified:'Not Yet Qualified',
};

function StatCard({ icon: Icon, label, value, color, to }) {
  const content = (
    <div className="card" style={{ padding: 24, cursor: to ? 'pointer' : 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon size={20} color={color} />
        </div>
        {to && <ArrowRight size={16} color='rgba(245,245,247,0.3)' />}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)' }}>{label}</div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

export default function Dashboard() {
  const { user, qual } = useAuth();
  const [stats, setStats] = useState({ listings: 0, bookings: 0, documents: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [listRes, bookRes, docRes] = await Promise.allSettled([
          api.getListings(),
          api.getMyBookings(),
          api.getMyDocuments(),
        ]);
        setStats({
          listings:  listRes.status === 'fulfilled' ? listRes.value.total || 0 : 0,
          bookings:  bookRes.status === 'fulfilled' ? bookRes.value.bookings?.length || 0 : 0,
          documents: docRes.status  === 'fulfilled' ? docRes.value.documents?.length || 0 : 0,
        });
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  const qualTier = qual?.qual_tier || user?.qual_tier;
  const tierColor = TIER_COLORS[qualTier] || '#888';
  const firstName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0];

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ color: 'rgba(245,245,247,0.4)', fontSize: 14, marginBottom: 6 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8 }}>
              Hello, {firstName} 👋
            </h1>
            {qualTier && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 100, fontSize: 12, fontWeight: 700,
                  background: `${tierColor}14`, border: `1px solid ${tierColor}30`,
                  color: tierColor, letterSpacing: '0.04em', textTransform: 'uppercase',
                }}>
                  {TIER_LABELS[qualTier] || qualTier}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA banner if not qualified */}
      {(!qualTier || qualTier === 'unqualified') && (
        <Link to="/qualify" style={{ textDecoration: 'none', display: 'block', marginBottom: 28 }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,113,227,0.15) 0%, rgba(48,209,88,0.1) 100%)',
            border: '1px solid rgba(0,113,227,0.25)',
            borderRadius: 18, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(0,113,227,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={22} color="#0071e3" />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>Get Qualified in 2 Minutes</div>
                <div style={{ color: 'rgba(245,245,247,0.45)', fontSize: 13 }}>
                  Unlock AI-matched listings and same-day move-in
                </div>
              </div>
            </div>
            <ArrowRight size={20} color="rgba(245,245,247,0.4)" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon={Home}       label="Active Listings"  value={loading ? '…' : stats.listings}  color="#0071e3" to="/listings" />
        <StatCard icon={BookOpen}   label="My Bookings"      value={loading ? '…' : stats.bookings}  color="#30d158" to="/bookings" />
        <StatCard icon={FileText}   label="Documents"        value={loading ? '…' : stats.documents} color="#ffd60a" to="/documents" />
        <StatCard icon={CheckCircle}label="Qual Score"       value={qual?.qual_score ? `${Math.round(qual.qual_score)}` : '—'} color="#ff9f0a" to="/qualify" />
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 16 }}>
          Quick Actions
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          {[
            { to: '/listings',  label: 'Browse Listings',   sub: 'AI-matched to you',         Icon: Home,        color: '#0071e3' },
            { to: '/qualify',   label: 'Run Qualification',  sub: 'Credit + income check',     Icon: TrendingUp,  color: '#30d158' },
            { to: '/documents', label: 'Upload Documents',   sub: 'Lease docs, pay stubs',     Icon: FileText,    color: '#ffd60a' },
          ].map(({ to, label, sub, Icon, color }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div className="card" style={{ padding: '20px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
                }}>
                  <Icon size={18} color={color} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)' }}>{sub}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* About DOOR */}
      <div className="card" style={{ padding: 28 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
          🚪 How DOOR Works
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 20, marginTop: 20 }}>
          {[
            { step: '01', title: 'Qualify', desc: 'Verify your ID, income, and credit in 2 minutes.' },
            { step: '02', title: 'Match',   desc: 'AI scores listings against your exact profile.' },
            { step: '03', title: 'Book',    desc: '1-tap booking. Move in same day with QR key.' },
          ].map(({ step, title, desc }) => (
            <div key={step}>
              <div style={{ fontSize: 11, color: '#0071e3', fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>
                STEP {step}
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)', lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
