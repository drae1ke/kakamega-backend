import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { publicLimiter, staffLimiter } from '../middleware/rateLimiter.js';
import { phoneSubmissionGuard } from '../middleware/submissionGuard.js';
import {
  createComplaint,
  trackComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  getAllComplaints,
  updateComplaintStatus,
  deleteComplaint,
  getComplaintStats,
} from '../controllers/complaintController.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

// ============ PUBLIC ROUTES (NO AUTH REQUIRED) ============
// These must come BEFORE router.use(protect)

// Submit a complaint
router.post(
  '/',
  publicLimiter,
  phoneSubmissionGuard,
  upload.array('attachments', 5),
  createComplaint
);

// Track a complaint by tracking number
//router.get('/track', publicLimiter, trackComplaint);
router.get('/track/:trackingNumber(*)', trackComplaint);

// ============ PROTECTED ROUTES (AUTH REQUIRED) ============
// Everything after this line requires authentication
router.use(protect);

// Staff routes
router.get('/all', staffLimiter, authorize('admin', 'officer'), getAllComplaints);
router.get('/mine', getMyComplaints);
router.get('/stats', authorize('admin', 'officer'), getComplaintStats);

router.route('/:id')
  .get(authorize('admin', 'officer'), getComplaintById)
  .put(authorize('admin', 'officer'), updateComplaint)
  .delete(authorize('admin'), deleteComplaint);

router.put(
  '/:id/status',
  staffLimiter,
  authorize('admin', 'officer'),
  updateComplaintStatus
);

export default router;