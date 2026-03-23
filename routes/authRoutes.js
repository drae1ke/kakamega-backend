import express from 'express';
import {
  login,
  getMe,
  updateMe,
  changePassword,
  createStaffAccount,
  deactivateStaffAccount,
  listStaffAccounts,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import { authLimiter, staffLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// ─── PUBLIC ROUTES ───────────────────────────────────────────────────────────
router.post('/login', authLimiter, login);

// ─── PROTECTED ROUTES (any authenticated staff) ──────────────────────────────
router.use(protect);

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/change-password', changePassword);

// ─── ADMIN-ONLY ROUTES ───────────────────────────────────────────────────────
router.post('/staff', staffLimiter, authorize('admin'), createStaffAccount);
router.get('/staff', authorize('admin'), listStaffAccounts);
router.put('/staff/:id/deactivate', staffLimiter, authorize('admin'), deactivateStaffAccount);

export default router;