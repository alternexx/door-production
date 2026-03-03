const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { scoreListingForUser } = require('../services/matching');

function parseListing(l) {
  return {
    ...l,
    amenities: Array.isArray(l.amenities) ? l.amenities : (typeof l.amenities === 'string' ? JSON.parse(l.amenities || '[]') : []),
    images: Array.isArray(l.images) ? l.images : (typeof l.images === 'string' ? JSON.parse(l.images || '[]') : []),
    documents: Array.isArray(l.documents) ? l.documents : (typeof l.documents === 'string' ? JSON.parse(l.documents || '[]') : []),
  };
}

// GET /api/listings — get all active listings with match scores
router.get('/', authenticate, async (req, res) => {
  try {
    const listingsResult = await query(
      'SELECT * FROM listings WHERE active = true ORDER BY created_at DESC'
    );
    const qualResult = await query(
      'SELECT * FROM qual_profiles WHERE user_id = $1', [req.user.id]
    );
    const qual = qualResult.rows[0] || null;

    const listings = listingsResult.rows.map(l => {
      const parsed = parseListing(l);
      const { match_score, match_reasons, eligible } = scoreListingForUser(parsed, qual);
      return { ...parsed, match_score, match_reasons, eligible };
    });

    // Sort: eligible first, then by match score
    listings.sort((a, b) => {
      if (a.eligible !== b.eligible) return b.eligible - a.eligible;
      return b.match_score - a.match_score;
    });

    res.json({
      listings,
      qual_tier: qual?.qual_tier || 'unqualified',
      total: listings.length,
    });
  } catch (err) {
    console.error('[Listings] Get error:', err.message);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});

// GET /api/listings/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Listing not found' });

    const listing = parseListing(result.rows[0]);

    // Get qual for match score
    const qualResult = await query('SELECT * FROM qual_profiles WHERE user_id = $1', [req.user.id]);
    const qual = qualResult.rows[0] || null;
    const { match_score, match_reasons, eligible } = scoreListingForUser(listing, qual);

    res.json({ listing: { ...listing, match_score, match_reasons, eligible } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch listing' });
  }
});

// POST /api/listings — create listing (owner/broker)
router.post('/', authenticate, async (req, res) => {
  try {
    if (!['owner', 'broker'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only owners and brokers can create listings' });
    }

    const { title, address, neighborhood, rent, beds, baths, sqft, available,
            amenities, pet_friendly, description, images } = req.body;

    if (!title || !address || !rent || beds === undefined || !baths) {
      return res.status(400).json({ error: 'Missing required fields: title, address, rent, beds, baths' });
    }

    const result = await query(`
      INSERT INTO listings (owner_id, title, address, neighborhood, rent, beds, baths, sqft,
                            available, amenities, images, pet_friendly, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [req.user.id, title, address, neighborhood, rent, beds, baths, sqft || null,
       available || null, JSON.stringify(amenities || []),
       JSON.stringify(images || []), !!pet_friendly, description || null]
    );

    res.status(201).json({ listing: parseListing(result.rows[0]) });
  } catch (err) {
    console.error('[Listings] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create listing' });
  }
});

// PATCH /api/listings/:id — update listing
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const listing = await query('SELECT * FROM listings WHERE id = $1', [req.params.id]);
    if (!listing.rows.length) return res.status(404).json({ error: 'Not found' });

    const l = listing.rows[0];
    if (l.owner_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { title, address, neighborhood, rent, beds, baths, sqft, available,
            amenities, pet_friendly, description, images, active } = req.body;

    const result = await query(`
      UPDATE listings SET
        title=COALESCE($1,title), address=COALESCE($2,address),
        neighborhood=COALESCE($3,neighborhood), rent=COALESCE($4,rent),
        beds=COALESCE($5,beds), baths=COALESCE($6,baths),
        amenities=COALESCE($7,amenities), pet_friendly=COALESCE($8,pet_friendly),
        description=COALESCE($9,description), images=COALESCE($10,images),
        active=COALESCE($11,active), updated_at=NOW()
      WHERE id=$12 RETURNING *`,
      [title, address, neighborhood, rent, beds, baths,
       amenities ? JSON.stringify(amenities) : null,
       pet_friendly !== undefined ? !!pet_friendly : null,
       description, images ? JSON.stringify(images) : null,
       active !== undefined ? !!active : null,
       req.params.id]
    );

    res.json({ listing: parseListing(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update listing' });
  }
});

module.exports = router;
