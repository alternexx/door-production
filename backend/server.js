// DOOR API Backend v4.0.0
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { Server } = require('socket.io');
const qrcode = require('qrcode');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4001' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'DOOR API v4',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    features: ['auth', 'qual', 'listings', 'bookings', 'uploads', 'realtime']
  });
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'TENANT' } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashedPassword, name, role }
    });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email, name, role } });
  } catch (error) {
    res.status(400).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    res.status(400).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: { qualProfile: true }
  });
  res.json(user);
});

// Qual routes
app.post('/api/qual/submit', authenticateToken, async (req, res) => {
  try {
    const { annualIncome, creditScore, idType, idNumber, dob } = req.body;
    // Mock verification (replace with Plaid/Stripe in prod)
    const qualScore = Math.min(100, 20 + (annualIncome / 1000) + (creditScore / 10));
    const qualTier = qualScore >= 80 ? 'PLATINUM' : qualScore >= 65 ? 'GOLD' : qualScore >= 45 ? 'SILVER' : 'BRONZE';
    
    const profile = await prisma.qualProfile.upsert({
      where: { userId: req.user.id },
      update: { annualIncome, creditScore, qualScore, qualTier, idType, idNumber, dob },
      create: { userId: req.user.id, annualIncome, creditScore, qualScore, qualTier, idType, idNumber, dob }
    });
    res.json(profile);
  } catch (error) {
    res.status(400).json({ error: 'Qual submission failed' });
  }
});

app.get('/api/qual/profile', authenticateToken, async (req, res) => {
  const profile = await prisma.qualProfile.findUnique({ where: { userId: req.user.id } });
  res.json(profile || null);
});

// Listings routes
app.get('/api/listings', authenticateToken, async (req, res) => {
  const listings = await prisma.listing.findMany({ where: { active: true } });
  // Mock match score (replace with real logic)
  const scoredListings = listings.map(listing => ({
    ...listing,
    matchScore: Math.floor(Math.random() * 100)
  }));
  res.json(scoredListings);
});

app.get('/api/listings/:id', authenticateToken, async (req, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id } });
  if (!listing) return res.status(404).json({ error: 'Listing not found' });
  res.json(listing);
});

// Booking routes
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { listingId, moveInDate } = req.body;
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || !listing.active) return res.status(400).json({ error: 'Listing unavailable' });
    
    const accessCode = Math.random().toString(36).substring(2, 15).toUpperCase();
    const qrCode = await qrcode.toDataURL(`DOOR:${accessCode}:${moveInDate}`);
    
    const booking = await prisma.booking.create({
      data: {
        listingId,
        tenantId: req.user.id,
        status: 'CONFIRMED',
        moveInDate: new Date(moveInDate),
        accessCode,
        qrCode
      }
    });
    
    await prisma.listing.update({ where: { id: listingId }, data: { active: false } });
    
    res.json(booking);
  } catch (error) {
    res.status(400).json({ error: 'Booking failed' });
  }
});

app.get('/api/bookings', authenticateToken, async (req, res) => {
  const bookings = await prisma.booking.findMany({ where: { tenantId: req.user.id } });
  res.json(bookings);
});

// Upload routes
app.post('/api/uploads/document', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload_stream({ resource_type: 'auto' }, async (error, result) => {
      if (error) throw error;
      const doc = await prisma.document.create({
        data: {
          userId: req.user.id,
          filename: req.file.originalname,
          url: result.secure_url,
          type: req.body.type || 'OTHER'
        }
      });
      res.json(doc);
    }).end(req.file.buffer);
  } catch (error) {
    res.status(400).json({ error: 'Upload failed' });
  }
});

// Socket.io for chat
const server = app.listen(PORT, () => console.log(`DOOR API running on port ${PORT}`));
const io = new Server(server, { cors: { origin: process.env.FRONTEND_URL || '*' } });

io.on('connection', (socket) => {
  socket.on('join-room', (roomId) => socket.join(roomId));
  socket.on('send-message', async (data) => {
    const message = await prisma.message.create({
      data: {
        roomId: data.roomId,
        senderId: socket.userId || data.senderId,
        content: data.content
      }
    });
    io.to(data.roomId).emit('receive-message', message);
  });
});

console.log('DOOR API v4.0.0 started');
