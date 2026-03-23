import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUserStats,
  getUserComplaints,
  updateUserRole,
  toggleUserStatus,
} from '../controllers/userController.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

// User statistics - Admin only
router.get('/stats', authorize('admin'), getUserStats);

// Get all users - Admin only
router.get('/', authorize('admin'), getAllUsers);

// User-specific routes
router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);

// Get user's complaints
router.get('/:id/complaints', getUserComplaints);

// Admin only routes for user management
router.put('/:id/role', authorize('admin'), updateUserRole);
router.put('/:id/toggle-status', authorize('admin'), toggleUserStatus);

export default router;