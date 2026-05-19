import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getDashboardStats,
  getRecentActivity,
  getAllRequests,
  getSystemHealth,
} from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/activity', getRecentActivity);
router.get('/requests', getAllRequests);
router.get('/health', getSystemHealth);

export default router;
