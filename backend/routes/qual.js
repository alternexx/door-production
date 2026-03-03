const express = require('express');
const router = express.Router();
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');
const { mockVerifyID, mockVerifyIncome, mockPullCredit } = require('../services/verify');
const { computeQualScore } = require('../services/matching');

// POST /api/qual/submit — run qualification
router.post('/submit', authenticate, async (req, res) => {
  try {
    const uid = req.user.id;
    const {
      id_type, id_number, dob,
      annual_income, employer, employment_type,
      credit_score_override,
      max_rent, min_beds, min_baths, neighborhoods,
      move_in_date, pet_friendly,
    } = req.body;

    // Run mock verifications in parallel
    const [idResult, incomeResult] = await Promise.all([
      mockVerifyID({ id_type, id_number, dob }),
      mockVerifyIncome({ annual_income, employer, employment_type }),
    ]);

    // Get SSN last4 for credit pull
    const userRow = await query('SELECT ssn_last4 FROM users WHERE id = $1', [uid]);
    const creditResult = await mockPullCredit({
      ssn_last4: userRow.rows[0]?.ssn_last4,
      credit_score_override,
    });

    const { qual_score, qual_tier, credit_tier } = computeQualScore({
      annual_income: parseFloat(annual_income),
      credit_score: creditResult.score,
      id_verified: idResult.verified,
      income_verified: incomeResult.verified,
    });

    const neighborhoodsJson = Array.isArray(neighborhoods) ? JSON.stringify(neighborhoods) : (neighborhoods || '[]');
    const neighborhoodsArr = typeof neighborhoodsJson === 'string' ? JSON.parse(neighborhoodsJson) : neighborhoodsJson;

    // Upsert qual profile
    const existing = await query('SELECT id FROM qual_profiles WHERE user_id = $1', [uid]);

    let profile;
    if (existing.rows.length) {
      const r = await query(`
        UPDATE qual_profiles SET
          id_type=$1, id_number=$2, dob=$3,
          annual_income=$4, employer=$5, employment_type=$6,
          credit_score=$7, credit_tier=$8,
          max_rent=$9, min_beds=$10, min_baths=$11, neighborhoods=$12,
          move_in_date=$13, pet_friendly=$14,
          income_verified=$15, id_verified=$16, credit_pulled=true,
          qual_score=$17, qual_tier=$18,
          updated_at=NOW()
        WHERE user_id=$19 RETURNING *`,
        [id_type, id_number, dob,
         annual_income, employer, employment_type,
         creditResult.score, credit_tier,
         max_rent, min_beds || 0, min_baths || 1, JSON.stringify(neighborhoodsArr),
         move_in_date || null, !!pet_friendly,
         incomeResult.verified, idResult.verified,
         qual_score, qual_tier,
         uid]
      );
      profile = r.rows[0];
    } else {
      const r = await query(`
        INSERT INTO qual_profiles
          (user_id, id_type, id_number, dob, annual_income, employer, employment_type,
           credit_score, credit_tier, max_rent, min_beds, min_baths, neighborhoods,
           move_in_date, pet_friendly, income_verified, id_verified, credit_pulled,
           qual_score, qual_tier)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,true,$18,$19)
        RETURNING *`,
        [uid, id_type, id_number, dob,
         annual_income, employer, employment_type,
         creditResult.score, credit_tier,
         max_rent, min_beds || 0, min_baths || 1, JSON.stringify(neighborhoodsArr),
         move_in_date || null, !!pet_friendly,
         incomeResult.verified, idResult.verified,
         qual_score, qual_tier]
      );
      profile = r.rows[0];
    }

    res.json({
      success: true,
      qual_score,
      qual_tier,
      credit_score: creditResult.score,
      credit_tier,
      id_verified: idResult.verified,
      income_verified: incomeResult.verified,
      profile,
    });
  } catch (err) {
    console.error('[Qual] Submit error:', err.message);
    res.status(500).json({ error: 'Qualification failed: ' + err.message });
  }
});

// GET /api/qual/profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const result = await query('SELECT * FROM qual_profiles WHERE user_id = $1', [req.user.id]);
    res.json({ profile: result.rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = router;
