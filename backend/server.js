require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const path = require('path');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 3737;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins for tunnel compatibility
  credentials: true,
}));
app.set('trust proxy', 1);
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/qual',     require('./routes/qual'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/uploads',  require('./routes/uploads'));

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'DOOR API',
  version: '4.0.0',
  timestamp: new Date().toISOString(),
}));

app.get('/api/health', (req, res) => res.json({
  status: 'ok',
  service: 'DOOR API v4',
  version: '4.0.0',
  timestamp: new Date().toISOString(),
  features: ['auth', 'qual', 'listings', 'bookings', 'uploads', 'realtime'],
}));

// ─── Socket.io — Real-time Chat ───────────────────────────────────────────────
const io = new SocketServer(server, {
  cors: { origin: [FRONTEND_URL, 'http://localhost:5173'], credentials: true },
});
const { query } = require('./db');

io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId, userId, userName }) => {
    socket.join(roomId);
    socket.to(roomId).emit('user_joined', { userId, userName, timestamp: new Date().toISOString() });
  });

  socket.on('send_message', async ({ roomId, senderId, senderName, text }) => {
    if (!roomId || !senderId || !text?.trim()) return;
    if (text.length > 1000) return socket.emit('error', { message: 'Message too long' });

    try {
      const result = await query(
        `INSERT INTO chat_messages (room_id, sender_id, sender_name, text)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [roomId, senderId, senderName, text.trim()]
      );
      io.to(roomId).emit('message', result.rows[0]);
    } catch (err) {
      console.error('[Socket] Message save error:', err.message);
    }
  });

  socket.on('typing', ({ roomId, userName, isTyping }) => {
    socket.to(roomId).emit('user_typing', { userName, isTyping });
  });

  socket.on('disconnect', () => {});
});

// ─── Serve local uploads ────────────────────────────────────────────────────
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/files', express.static(uploadsPath));

// ─── 404 & Error Handler ─────────────────────────────────────────────────────
app.use('/api/*', (req, res) => res.status(404).json({ error: 'Endpoint not found' }));
app.use((err, req, res, next) => {
  console.error('[Error]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚪 DOOR API v4 → http://localhost:${PORT}`);
  console.log(`   Routes: auth | qual | listings | bookings | uploads | realtime\n`);
});

module.exports = { app, server, io };
