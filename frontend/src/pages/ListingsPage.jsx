import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth.jsx';
import { MapPin, Bed, Bath, Maximize, Zap, Heart, X, Check, ChevronRight, DollarSign, PawPrint } from 'lucide-react';
import { Link } from 'react-router-dom';

const TIER_COLORS = { platinum:'#e8e8e8', gold:'#ffd60a', silver:'#94a3b8', bronze:'#ff9f0a', unqualified:'#ff453a' };

function ScoreRing({ score }) {
  const color = score >= 70 ? '#30d158' : score >= 50 ? '#ffd60a' : 'rgba(255,255,255,0.2)';
  return (
    <div style={{
      width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${color}`, background: `${color}12`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 800, color, letterSpacing: '-0.03em',
    }}>{score || '—'}</div>
  );
}

function BookingModal({ listing, onClose, onBooked }) {
  const [moveIn, setMoveIn] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const book = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.createBooking({ listing_id: listing.id, move_in_date: moveIn });
      setSuccess(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" style={{ padding: 40, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 8 }}>Booking Confirmed!</h2>
          <p style={{ color: 'rgba(245,245,247,0.5)', marginBottom: 24 }}>
            {listing.title} · Move in {success.move_in_date}
          </p>
          {success.qr_code && (
            <div style={{ marginBottom: 24 }}>
              <img src={success.qr_code} alt="QR Code" style={{ width: 180, height: 180, borderRadius: 12 }} />
              <p style={{ fontSize: 13, color: 'rgba(245,245,247,0.4)', marginTop: 8 }}>
                Access Code: <strong style={{ color: '#30d158', letterSpacing: '0.1em' }}>{success.access_code}</strong>
              </p>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost btn-full" onClick={onClose}>Close</button>
            <Link to="/bookings" className="btn btn-primary btn-full" onClick={() => { onBooked(); onClose(); }}>
              View My Bookings →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>{listing.title}</h2>
            <p style={{ color: 'rgba(245,245,247,0.45)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={13} /> {listing.address}
            </p>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {/* Image */}
        {listing.images?.[0] && (
          <div style={{ margin: '20px 28px', borderRadius: 14, overflow: 'hidden', height: 200 }}>
            <img src={listing.images[0]} alt={listing.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ padding: '0 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#0071e3' }}>
              ${listing.rent?.toLocaleString()}<span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(245,245,247,0.4)' }}>/mo</span>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {[
                { Icon: Bed,      value: listing.beds === 0 ? 'Studio' : `${listing.beds}BR` },
                { Icon: Bath,     value: `${listing.baths}BA` },
                { Icon: Maximize, value: listing.sqft ? `${listing.sqft}sqft` : null },
              ].filter(x => x.value).map(({ Icon, value }) => (
                <span key={value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(245,245,247,0.5)' }}>
                  <Icon size={13} /> {value}
                </span>
              ))}
            </div>
          </div>

          {/* Match reasons */}
          {listing.match_reasons?.length > 0 && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16 }}>
              <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Match Analysis</p>
              {listing.match_reasons.map((r, i) => (
                <p key={i} style={{ fontSize: 13, color: 'rgba(245,245,247,0.6)', padding: '3px 0' }}>{r}</p>
              ))}
            </div>
          )}

          {/* Move in date */}
          <div className="form-group">
            <label className="form-label">Move-In Date</label>
            <input className="form-input" type="date" value={moveIn}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => setMoveIn(e.target.value)} />
          </div>

          {!listing.eligible && (
            <div style={{ background:'rgba(255,69,58,0.08)', border:'1px solid rgba(255,69,58,0.15)', borderRadius:12, padding:'12px 16px', color:'rgba(255,69,58,0.9)', fontSize:13 }}>
              ⚠️ You may not meet all requirements for this listing. Complete qualification first.
            </div>
          )}

          {error && (
            <div style={{ background:'rgba(255,69,58,0.08)', border:'1px solid rgba(255,69,58,0.15)', borderRadius:12, padding:'12px 16px', color:'#ff453a', fontSize:13 }}>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-full btn-lg" disabled={loading} onClick={book}>
            {loading
              ? <><div className="spinner spinner-sm" /> Booking…</>
              : <>⚡ Book with DOOR — Same Day</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ListingsPage() {
  const { qual } = useAuth();
  const [listings, setListings] = useState([]);
  const [qualTier, setQualTier] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState({ beds: 'any', maxRent: '', pet: false });

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { listings, qual_tier } = await api.getListings();
      setListings(listings);
      setQualTier(qual_tier);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = listings.filter(l => {
    if (filter.beds !== 'any') {
      if (filter.beds === '0' && l.beds !== 0) return false;
      if (filter.beds === '1' && l.beds !== 1) return false;
      if (filter.beds === '2' && l.beds !== 2) return false;
      if (filter.beds === '3+' && l.beds < 3) return false;
    }
    if (filter.maxRent && l.rent > parseFloat(filter.maxRent)) return false;
    if (filter.pet && !l.pet_friendly) return false;
    return true;
  });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 6 }}>
          Available Listings
        </h1>
        {qualTier && qualTier !== 'unqualified' ? (
          <p style={{ color: 'rgba(245,245,247,0.45)', fontSize: 14 }}>
            AI-matched for your {qualTier} profile · {filtered.length} results
          </p>
        ) : (
          <p style={{ color: 'rgba(245,245,247,0.45)', fontSize: 14 }}>
            <Link to="/qualify" style={{ color: '#0071e3' }}>Get qualified</Link> to see personalized match scores
          </p>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 }}>
          {['any','0','1','2','3+'].map(b => (
            <button key={b} onClick={() => setFilter(f => ({ ...f, beds: b }))} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', fontFamily: 'inherit',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
              background: filter.beds === b ? 'rgba(255,255,255,0.12)' : 'transparent',
              color: filter.beds === b ? '#f5f5f7' : 'rgba(245,245,247,0.4)',
            }}>
              {b === 'any' ? 'All' : b === '0' ? 'Studio' : b === '3+' ? '3+ BR' : `${b} BR`}
            </button>
          ))}
        </div>
        <input
          className="form-input"
          type="number" placeholder="Max rent $" value={filter.maxRent}
          onChange={e => setFilter(f => ({ ...f, maxRent: e.target.value }))}
          style={{ width: 140 }}
        />
        <button
          onClick={() => setFilter(f => ({ ...f, pet: !f.pet }))}
          style={{
            padding: '8px 14px', borderRadius: 10, border: `1px solid ${filter.pet ? 'rgba(0,113,227,0.4)' : 'rgba(255,255,255,0.1)'}`,
            background: filter.pet ? 'rgba(0,113,227,0.12)' : 'rgba(255,255,255,0.04)',
            color: filter.pet ? '#0071e3' : 'rgba(245,245,247,0.5)',
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <PawPrint size={14} /> Pet-Friendly
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spinner spinner-lg" />
        </div>
      )}

      {error && (
        <div style={{ background:'rgba(255,69,58,0.08)', border:'1px solid rgba(255,69,58,0.15)', borderRadius:14, padding:24, textAlign:'center' }}>
          <p style={{ color: '#ff453a', marginBottom: 12 }}>{error}</p>
          <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 20 }}>
          {filtered.map(listing => (
            <div key={listing.id} className="card" style={{ overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
              onClick={() => setSelected(listing)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
              {/* Image */}
              {listing.images?.[0] ? (
                <div style={{ height: 180, overflow: 'hidden', position: 'relative' }}>
                  <img src={listing.images[0]} alt={listing.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {listing.same_day && (
                    <div style={{
                      position: 'absolute', top: 12, left: 12,
                      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
                      borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                      color: '#30d158', border: '1px solid rgba(48,209,88,0.3)',
                    }}>⚡ Same Day</div>
                  )}
                  {listing.match_score > 0 && (
                    <div style={{ position: 'absolute', top: 12, right: 12 }}>
                      <ScoreRing score={listing.match_score} />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ height: 120, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                  🏠
                </div>
              )}

              <div style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', flex: 1, marginRight: 8 }}>{listing.title}</h3>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.4)', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 14 }}>
                  <MapPin size={11} /> {listing.neighborhood}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f5f5f7', letterSpacing: '-0.03em' }}>
                    ${listing.rent?.toLocaleString()}
                    <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(245,245,247,0.35)' }}>/mo</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { Icon: Bed, value: listing.beds === 0 ? 'S' : listing.beds },
                      { Icon: Bath, value: listing.baths },
                    ].map(({ Icon, value }) => (
                      <span key={value} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, color: 'rgba(245,245,247,0.4)' }}>
                        <Icon size={12} /> {value}
                      </span>
                    ))}
                    {listing.pet_friendly && <PawPrint size={13} color="rgba(245,245,247,0.35)" />}
                  </div>
                </div>

                {listing.eligible && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.15)', borderRadius: 8 }}>
                    <p style={{ fontSize: 11, color: '#30d158', fontWeight: 600 }}>✓ You qualify for this listing</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filtered.length === 0 && !loading && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'rgba(245,245,247,0.3)' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <p style={{ fontSize: 16 }}>No listings match your filters.</p>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}
                onClick={() => setFilter({ beds: 'any', maxRent: '', pet: false })}>
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {selected && (
        <BookingModal
          listing={selected}
          onClose={() => setSelected(null)}
          onBooked={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}
