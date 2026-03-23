import express from 'express';
import authRoutes from './authRoutes.js';
import complaintRoutes from './complaintRoutes.js';
import userRoutes from './userRoutes.js';
import serviceRoutes from './serviceRoutes.js';
import adminRoutes from './adminRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/complaints', complaintRoutes);
router.use('/users', userRoutes);
router.use('/services', serviceRoutes);
router.use('/admin', adminRoutes);

// Health check
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

export default router;