const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

// POST /api/bookings — 1-tap book
router.post('/', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'tenant') {
      return res.status(403).json({ error: 'Only tenants can book' });
    }

    const { listing_id, move_in_date, notes } = req.body;
    if (!listing_id) return res.status(400).json({ error: 'listing_id required' });

    // Check qualification
    const qualResult = await query(
      'SELECT qual_tier, qual_score FROM qual_profiles WHERE user_id = $1', [req.user.id]
    );
    const qual = qualResult.rows[0];
    if (!qual || qual.qual_tier === 'unqualified') {
      return res.status(403).json({ error: 'Complete qualification before booking' });
    }

    // Check listing exists
    const listingResult = await query(
      'SELECT * FROM listings WHERE id = $1 AND active = true', [listing_id]
    );
    if (!listingResult.rows.length) {
      return res.status(404).json({ error: 'Listing not found or unavailable' });
    }
    const listing = listingResult.rows[0];

    // Prevent duplicate
    const dupResult = await query(
      "SELECT id FROM bookings WHERE listing_id=$1 AND tenant_id=$2 AND status != 'cancelled'",
      [listing_id, req.user.id]
    );
    if (dupResult.rows.length) {
      return res.status(409).json({ error: 'You already have an active booking for this listing' });
    }

    // Generate access code + QR
    const access_code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const finalMoveIn = move_in_date || new Date().toISOString().split('T')[0];

    const qrPayload = JSON.stringify({
      listing: listing.address,
      tenant: req.user.email,
      move_in: finalMoveIn,
      access_code,
      issued: new Date().toISOString(),
    });

    const qr_code = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 2,
      color: { dark: '#0f0f13', light: '#ffffff' },
      width: 300,
    });

    const bookingResult = await query(`
      INSERT INTO bookings (listing_id, tenant_id, move_in_date, status, qr_code, access_code, monthly_rent, confirmed_at, notes)
      VALUES ($1,$2,$3,'confirmed',$4,$5,$6,NOW(),$7)
      RETURNING *`,
      [listing_id, req.user.id, finalMoveIn, qr_code, access_code, listing.rent, notes || null]
    );

    // Mark listing inactive
    await query('UPDATE listings SET active = false, updated_at = NOW() WHERE id = $1', [listing_id]);

    const booking = bookingResult.rows[0];

    res.status(201).json({
      booking: {
        ...booking,
        listing_title: listing.title,
        listing_address: listing.address,
        listing_neighborhood: listing.neighborhood,
      },
      access_code,
      qr_code,
      move_in_date: finalMoveIn,
      message: '🎉 Booking confirmed! Your keys QR is ready.',
    });
  } catch (err) {
    console.error('[Bookings] Error:', err.message);
    res.status(500).json({ error: 'Booking failed: ' + err.message });
  }
});

// GET /api/bookings/mine
router.get('/mine', authenticate, async (req, res) => {
  try {
    const result = await query(`
      SELECT b.*, l.title as listing_title, l.address as listing_address,
             l.neighborhood, l.rent, l.beds, l.baths, l.images
      FROM bookings b
      LEFT JOIN listings l ON b.listing_id = l.id
      WHERE b.tenant_id = $1
      ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json({ bookings: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// DELETE /api/bookings/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const bookingResult = await query(
      'SELECT * FROM bookings WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.user.id]
    );
    if (!bookingResult.rows.length) return res.status(404).json({ error: 'Booking not found' });

    const booking = bookingResult.rows[0];
    await query("UPDATE bookings SET status = 'cancelled' WHERE id = $1", [req.params.id]);
    await query('UPDATE listings SET active = true, updated_at = NOW() WHERE id = $1', [booking.listing_id]);

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (err) {
    res.status(500).json({ error: 'Cancel failed' });
  }
});

module.exports = router;
