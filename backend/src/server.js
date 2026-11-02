import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import mysteryRoutes from './routes/mysteryRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';
import { geminiKeyManager } from './services/geminiKeyManager.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Middleware
app.use(
  cors({
    origin: true, // Dynamically reflects request origin (e.g. Vercel), allowing withCredentials
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));

// Root Service Info Route
app.get('/', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'AI Mystery Room Forensic Backend API',
    message: 'Backend API is running. Launch the game from your frontend deployment!',
    frontendUrl: 'https://ai-mystery-room-nu-three.vercel.app',
    healthCheck: '/api/health',
  });
});

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'AI Mystery Room Forensic Mainframe',
    timestamp: new Date().toISOString(),
    geminiConfigured: geminiKeyManager.hasKeys(),
    geminiKeysCount: geminiKeyManager.getKeyCount(),
  });
});

// Mount Routes (supports both /api and /api/api for robust client compatibility)
app.use(['/api/auth', '/api/api/auth'], authRoutes);
app.use(['/api/mysteries', '/api/api/mysteries'], mysteryRoutes);
app.use(['/api/bot', '/api/api/bot'], chatbotRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: 'Endpoint not found in Forensic Archive.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ message: 'Internal server error occurred.', error: err.message });
});

// Start Server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🕵️  AI Mystery Room Backend running on port ${PORT}`);
  console.log(`📡  Health check: http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);
});
