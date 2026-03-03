import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import {
  Home, Search, CheckCircle, BookOpen, FileText, LogOut, Menu, X, ChevronRight, MessageCircle
} from 'lucide-react';

const TIER_COLORS = {
  platinum:    '#e8e8e8',
  gold:        '#ffd60a',
  silver:      '#94a3b8',
  bronze:      '#ff9f0a',
  unqualified: '#ff453a',
};
const TIER_ICONS = {
  platinum: '⬟', gold: '★', silver: '◇', bronze: '◆', unqualified: '○',
};

function TierBadge({ tier }) {
  if (!tier) return null;
  const color = TIER_COLORS[tier] || '#888';
  const icon  = TIER_ICONS[tier] || '○';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 10px', borderRadius: 100,
      background: `${color}14`, border: `1px solid ${color}30`,
      color, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {icon} {tier}
    </span>
  );
}

const NAV = [
  { to: '/',          label: 'Dashboard',  Icon: Home },
  { to: '/qualify',   label: 'Qualify',    Icon: CheckCircle },
  { to: '/listings',  label: 'Listings',   Icon: Search },
  { to: '/bookings',  label: 'Bookings',   Icon: BookOpen },
  { to: '/documents', label: 'Documents',  Icon: FileText },
  { to: '/chat',      label: 'Chat',       Icon: MessageCircle },
];

export default function Layout() {
  const { user, qual, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const qualTier = qual?.qual_tier || user?.qual_tier;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240, background: '#080808',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, zIndex: 20,
        transition: 'transform 0.3s',
      }} className="hide-mobile">
        <SidebarContent user={user} qualTier={qualTier} logout={logout} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          <div onClick={() => setMobileOpen(false)}
            style={{ flex: 1, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
          <aside style={{
            width: 260, background: '#080808',
            borderLeft: '1px solid rgba(255,255,255,0.08)',
            display: 'flex', flexDirection: 'column',
            animation: 'slideDown 0.25s ease',
          }}>
            <div style={{ padding: '16px 16px 0', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <SidebarContent user={user} qualTier={qualTier} logout={() => { setMobileOpen(false); logout(); }} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        {/* Mobile top bar */}
        <div style={{
          display: 'none', padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: '#080808', alignItems: 'center', justifyContent: 'space-between',
        }} className="show-mobile" id="mobile-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 20 }}>🚪</div>
            <span style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-0.03em' }}>DOOR</span>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
        </div>

        <main style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({ user, qualTier, logout }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px 12px' }}>
      {/* Logo */}
      <div style={{ padding: '8px 12px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #0071e3, #30d158)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          boxShadow: '0 2px 10px rgba(0,113,227,0.4)',
        }}>🚪</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.04em' }}>DOOR</div>
          <div style={{ fontSize: 10, color: 'rgba(245,245,247,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Same-Day Rental
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 10,
              background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: isActive ? '#f5f5f7' : 'rgba(245,245,247,0.45)',
              textDecoration: 'none', fontWeight: isActive ? 600 : 400,
              fontSize: 14, transition: 'all 0.15s', letterSpacing: '-0.01em',
            })}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} strokeWidth={isActive ? 2.5 : 1.8} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div style={{
        padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.06)',
        marginTop: 16,
      }}>
        {qualTier && <div style={{ marginBottom: 12 }}><TierBadge tier={qualTier} /></div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0071e3, #30d158)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, flexShrink: 0,
          }}>
            {user?.full_name ? user.full_name[0].toUpperCase() : user?.email[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', truncate: true, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.full_name || user?.email?.split('@')[0]}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(245,245,247,0.3)', textTransform: 'capitalize' }}>
              {user?.role}
            </div>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm btn-full"
          onClick={logout}
          style={{ justifyContent: 'flex-start', gap: 8 }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}
