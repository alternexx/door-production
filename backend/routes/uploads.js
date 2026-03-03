const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query } = require('../db');
const { authenticate } = require('../middleware/auth');

// ─── Storage: Local or Cloudinary depending on env ─────────────────────────
const USE_CLOUDINARY = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let cloudinary;
if (USE_CLOUDINARY) {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Local storage setup
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(UPLOADS_DIR, req.user.id);
    fs.mkdirSync(userDir, { recursive: true });
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const memoryStorage = multer.memoryStorage();

const upload = multer({
  storage: USE_CLOUDINARY ? memoryStorage : localStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf',
                     'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('File type not allowed. Accepted: JPG, PNG, PDF, DOC'));
  },
});

async function getFileUrl(req, file, result) {
  if (USE_CLOUDINARY) {
    return result.secure_url;
  }
  // Local: construct URL via our API
  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
  return `${baseUrl}/uploads/${req.user.id}/${file.filename}`;
}

// POST /api/uploads/document
router.post('/document', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { type = 'document', listing_id, booking_id } = req.body;

    let fileUrl;

    if (USE_CLOUDINARY) {
      // Upload buffer to Cloudinary
      const isImage = req.file.mimetype.startsWith('image/');
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: isImage ? 'door/images' : 'door/documents', resource_type: isImage ? 'image' : 'raw' },
          (err, r) => err ? reject(err) : resolve(r)
        );
        stream.end(req.file.buffer);
      });
      fileUrl = result.secure_url;
    } else {
      // Local storage — file is already saved
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
      fileUrl = `${baseUrl}/files/${req.user.id}/${req.file.filename}`;
    }

    const docResult = await query(`
      INSERT INTO documents (user_id, listing_id, booking_id, type, name, url, size, mime_type)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, listing_id || null, booking_id || null,
       type, req.file.originalname, fileUrl,
       req.file.size, req.file.mimetype]
    );

    res.json({ success: true, document: docResult.rows[0], url: fileUrl });
  } catch (err) {
    console.error('[Upload] Error:', err.message);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// GET /api/uploads/my-documents
router.get('/my-documents', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM documents WHERE user_id = $1 ORDER BY uploaded_at DESC', [req.user.id]
    );
    res.json({ documents: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// DELETE /api/uploads/document/:id
router.delete('/document/:id', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Document not found' });

    const doc = result.rows[0];

    if (USE_CLOUDINARY) {
      // Delete from Cloudinary
      const parts = doc.url.split('/');
      const publicId = parts.slice(-2).join('/').split('.')[0];
      try { await cloudinary.uploader.destroy(publicId); } catch {}
    } else {
      // Delete local file
      try {
        const urlParts = doc.url.split('/files/');
        if (urlParts[1]) {
          const filePath = path.join(UPLOADS_DIR, urlParts[1]);
          fs.unlinkSync(filePath);
        }
      } catch {}
    }

    await query('DELETE FROM documents WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
