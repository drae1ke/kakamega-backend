import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './middleware/logger.js';
import { publicLimiter, authLimiter, staffLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to database
connectDB();

const app = express();

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
// Create subdirectories
['complaints', 'applications', 'profiles', 'general'].forEach(dir => {
  const subDir = path.join(uploadDir, dir);
  if (!fs.existsSync(subDir)) {
    fs.mkdirSync(subDir, { recursive: true });
  }
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:5000','https://kakamega-backend-damo.onrender.com', 'https://kakamegaconnect.netlify.app'],
  credentials: true,
}));

// Compression
app.use(compression());

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}
// Custom logger for all environments
app.use(logger);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ============ RATE LIMITING BY ENDPOINT TYPE ============

// Apply public limiter to citizen-facing endpoints
app.use('/api/v1/complaints', publicLimiter);
app.use('/api/v1/services/*/apply', publicLimiter);
app.use('/api/v1/auth/register', publicLimiter);

// Apply auth limiter to authentication endpoints
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/change-password', authLimiter);

// Apply staff limiter to admin and officer endpoints
app.use('/api/v1/admin', staffLimiter);
app.use('/api/v1/users', staffLimiter);
app.use('/api/v1/complaints/all', staffLimiter);
app.use('/api/v1/complaints/*/status', staffLimiter);
app.use('/api/v1/services/applications/*/status', staffLimiter);

// API routes
app.use('/api/v1', routes);

// Health check endpoint (no rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

// Error handler
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

const PORT = config.port || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${config.nodeEnv} mode on port ${PORT}`);
  console.log(`📝 API Documentation: http://localhost:${PORT}/api/v1`);
  console.log(`❤️  Health Check: http://localhost:${PORT}/health`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

export default app;