import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { publicLimiter, staffLimiter } from '../middleware/rateLimiter.js';
import { phoneSubmissionGuard } from '../middleware/submissionGuard.js';
import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getServiceCategories,
  getServicesByDepartment,
  getDepartments,
  applyForService,
  getUserApplications,
  getServiceApplicationById,
  updateApplicationStatus,
  getServiceStats,
  updatePaymentStatus,
  bulkUpdateServiceStatus,
  trackApplication,
} from '../controllers/serviceController.js';
import { upload } from '../utils/fileUpload.js';

const router = express.Router();

// ─── PUBLIC ROUTES (no auth required) ───────────────────────────────────────
router.get('/', publicLimiter, getAllServices);
router.get('/categories', getServiceCategories);
router.get('/departments', getDepartments);
router.get('/departments/:department', getServicesByDepartment);
router.get('/:id', getServiceById);

router.post(
  '/:id/apply',
  publicLimiter,
  phoneSubmissionGuard,
  upload.array('documents', 5),
  applyForService
);

router.get('/applications/track/:trackingNumber', publicLimiter, trackApplication);

// ─── PROTECTED ROUTES (staff only) ──────────────────────────────────────────
router.use(protect);

router.get('/applications/all', staffLimiter, authorize('admin', 'officer'), getUserApplications);

router.get(
  '/applications/:applicationId',
  authorize('admin', 'officer'),
  getServiceApplicationById
);

router.put(
  '/applications/:applicationId/status',
  staffLimiter,
  authorize('admin', 'officer'),
  updateApplicationStatus
);

router.put(
  '/applications/:applicationId/payment',
  staffLimiter,
  authorize('admin', 'officer'),
  updatePaymentStatus
);

// Admin only
router.use(authorize('admin'));

router.post('/', staffLimiter, createService);
router.put('/:id', staffLimiter, updateService);
router.delete('/:id', deleteService);
router.get('/stats/overview', getServiceStats);
router.put('/bulk/status', staffLimiter, bulkUpdateServiceStatus);

export default router;