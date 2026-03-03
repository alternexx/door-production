const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db');
const { sign, authenticate } = require('../middleware/auth');

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, full_name, phone, ssn } = req.body;

    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Valid email required' });
    if (!password || password.length < 8) return res.status(400).json({ error: 'Password must be 8+ characters' });
    if (!['tenant', 'owner', 'broker'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const exists = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const ssnClean = ssn ? ssn.replace(/[-\s]/g, '') : null;
    const ssn_last4 = ssnClean ? ssnClean.slice(-4) : null;
    const ssn_hash = ssnClean ? await bcrypt.hash(ssnClean, 10) : null;

    const result = await query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, ssn_last4, ssn_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [email.toLowerCase(), password_hash, role, full_name || null, phone || null, ssn_last4, ssn_hash]
    );

    const user = result.rows[0];
    const token = sign(user);
    const { password_hash: _, ssn_hash: __, ...safeUser } = user;

    res.status(201).json({ token, user: safeUser });
  } catch (err) {
    console.error('[Auth] Register error:', err.message);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Get qual profile
    const qualResult = await query(
      'SELECT qual_tier, qual_score FROM qual_profiles WHERE user_id = $1',
      [user.id]
    );
    const qual = qualResult.rows[0];

    const token = sign(user);
    const { password_hash, ssn_hash, ...safeUser } = user;

    res.json({
      token,
      user: {
        ...safeUser,
        qual_tier: qual?.qual_tier || null,
        qual_score: qual?.qual_score || null,
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const userResult = await query(
      'SELECT id, email, role, full_name, phone, ssn_last4, verified, avatar_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const qualResult = await query('SELECT * FROM qual_profiles WHERE user_id = $1', [req.user.id]);
    const qual = qualResult.rows[0];

    res.json({ user, qual: qual || null });
  } catch (err) {
    console.error('[Auth] Me error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', authenticate, async (req, res) => {
  try {
    const { full_name, phone, avatar_url } = req.body;
    const result = await query(
      `UPDATE users SET full_name=$1, phone=$2, avatar_url=$3, updated_at=NOW()
       WHERE id=$4 RETURNING id, email, role, full_name, phone, avatar_url, verified`,
      [full_name, phone, avatar_url, req.user.id]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

module.exports = router;
