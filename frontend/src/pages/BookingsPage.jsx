import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { MapPin, Calendar, Key, QrCode, X, Trash2 } from 'lucide-react';

function QRModal({ booking, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ padding: 36, textAlign: 'center', maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <button className="btn btn-ghost btn-icon" onClick={onClose} style={{ position: 'absolute', top: 16, right: 16 }}>
          <X size={18} />
        </button>
        <div style={{ fontSize: 28, marginBottom: 12 }}>🗝️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>Your Access Key</h2>
        <p style={{ color: 'rgba(245,245,247,0.45)', fontSize: 13, marginBottom: 24 }}>{booking.listing_address}</p>
        {booking.qr_code && (
          <img src={booking.qr_code} alt="QR Code" style={{ width: 220, height: 220, borderRadius: 14, marginBottom: 16 }} />
        )}
        <div style={{
          background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)',
          borderRadius: 12, padding: '12px 20px', marginBottom: 20,
        }}>
          <p style={{ fontSize: 11, color: 'rgba(245,245,247,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Access Code</p>
          <p style={{ fontSize: 28, fontWeight: 800, letterSpacing: '0.15em', color: '#30d158' }}>{booking.access_code}</p>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(245,245,247,0.3)' }}>Show this QR at the property on move-in day</p>
      </div>
    </div>
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedQR, setSelectedQR] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const { bookings } = await api.getMyBookings();
      setBookings(bookings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!confirm('Cancel this booking? The listing will become available again.')) return;
    setCancelling(id);
    try {
      await api.cancelBooking(id);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setCancelling(null);
    }
  };

  const STATUS_COLORS = { confirmed: '#30d158', pending: '#ffd60a', cancelled: 'rgba(255,255,255,0.3)' };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em', marginBottom: 6 }}>My Bookings</h1>
        <p style={{ color: 'rgba(245,245,247,0.45)', fontSize: 14 }}>Your rental history and active bookings</p>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <div className="spinner spinner-lg" />
        </div>
      )}

      {!loading && !error && bookings.length === 0 && (
        <div className="card" style={{ padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No bookings yet</h3>
          <p style={{ color: 'rgba(245,245,247,0.4)', fontSize: 14, marginBottom: 24 }}>
            Browse listings and book your first rental
          </p>
          <a href="/listings" className="btn btn-primary">Browse Listings →</a>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {bookings.map(b => {
          const statusColor = STATUS_COLORS[b.status] || '#888';
          const isCancelled = b.status === 'cancelled';
          return (
            <div key={b.id} className="card" style={{ padding: 24, opacity: isCancelled ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{
                      padding: '2px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                      background: `${statusColor}14`, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>
                      {b.status}
                    </span>
                    {b.status === 'confirmed' && <span style={{ fontSize: 11, color: 'rgba(245,245,247,0.3)' }}>⚡ Same-day eligible</span>}
                  </div>

                  <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 6 }}>
                    {b.listing_title || 'Listing'}
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                    {[
                      { Icon: MapPin,   value: b.listing_address || b.neighborhood },
                      { Icon: Calendar, value: `Move in: ${b.move_in_date ? new Date(b.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBD'}` },
                      { Icon: Key,      value: `$${parseFloat(b.monthly_rent || b.rent || 0).toLocaleString()}/mo` },
                    ].filter(x => x.value).map(({ Icon, value }) => (
                      <span key={value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'rgba(245,245,247,0.45)' }}>
                        <Icon size={13} /> {value}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  {b.qr_code && b.status === 'confirmed' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setSelectedQR(b)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <QrCode size={14} /> View Keys
                    </button>
                  )}
                  {!isCancelled && (
                    <button className="btn btn-danger btn-sm" onClick={() => cancel(b.id)}
                      disabled={cancelling === b.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {cancelling === b.id ? <div className="spinner spinner-sm" /> : <Trash2 size={14} />}
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {b.access_code && b.status === 'confirmed' && (
                <div style={{
                  marginTop: 16, padding: '8px 14px',
                  background: 'rgba(48,209,88,0.06)', border: '1px solid rgba(48,209,88,0.15)',
                  borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <Key size={13} color="#30d158" />
                  <span style={{ fontSize: 12, color: 'rgba(245,245,247,0.5)' }}>
                    Access Code: <strong style={{ color: '#30d158', letterSpacing: '0.1em' }}>{b.access_code}</strong>
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedQR && <QRModal booking={selectedQR} onClose={() => setSelectedQR(null)} />}
    </div>
  );
}
