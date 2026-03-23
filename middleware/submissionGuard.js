import Complaint from '../models/Complaint.js';
import ServiceApplication from '../models/ServiceApplication.js';
import AppError from '../utils/AppError.js';

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_PENDING_COMPLAINTS   = 5;  // max open complaints per phone number
const MAX_PENDING_APPLICATIONS = 3;  // max pending applications per phone number
const WINDOW_HOURS             = 24; // rolling window in hours

// ─── phoneSubmissionGuard ────────────────────────────────────────────────────
// Middleware that checks if an anonymous citizen (identified by phone number in
// the request body) has exceeded their submission quota.
//
// This prevents:
//  - Spam/flood attacks using fake submissions
//  - A single person from clogging the queue
//  - Duplicate submissions for the same issue
//
// It does NOT block legitimate re-submissions after issues are resolved.

export const phoneSubmissionGuard = async (req, res, next) => {
  try {
    const phone = req.body?.phoneNumber?.trim();

    // If no phone provided, let the controller's validator handle it
    if (!phone) return next();

    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

    // Determine which model to check based on the route
    const isServiceRoute = req.baseUrl.includes('service') || req.path.includes('apply');

    if (isServiceRoute) {
      // Check pending service applications from this phone in the last 24h
      const pendingCount = await ServiceApplication.countDocuments({
        'applicantDetails.phone': phone,
        status: { $in: ['pending', 'processing'] },
        createdAt: { $gte: windowStart },
      });

      if (pendingCount >= MAX_PENDING_APPLICATIONS) {
        return next(
          new AppError(
            `You have ${pendingCount} pending applications. Please wait for them to be processed before submitting new ones.`,
            429
          )
        );
      }
    } else {
      // Check pending complaints from this phone in the last 24h
      const pendingCount = await Complaint.countDocuments({
        phoneNumber: phone,
        status: { $in: ['pending', 'in-review', 'in-progress'] },
        createdAt: { $gte: windowStart },
      });

      if (pendingCount >= MAX_PENDING_COMPLAINTS) {
        return next(
          new AppError(
            `You have ${pendingCount} active complaints under review. Please wait for them to be addressed before filing new ones.`,
            429
          )
        );
      }

      // Check for near-duplicate: same phone + same category + same ward in last 24h
      if (req.body?.category && req.body?.ward) {
        const duplicate = await Complaint.findOne({
          phoneNumber: phone,
          category:    req.body.category,
          'location.ward': req.body.ward,
          createdAt:   { $gte: windowStart },
        });

        if (duplicate) {
          return next(
            new AppError(
              `A similar complaint for ${req.body.category} in ${req.body.ward} was already submitted recently (tracking: ${duplicate.trackingNumber}). Please track its progress instead.`,
              409
            )
          );
        }
      }
    }

    next();
  } catch (error) {
    // Don't block submission if the guard itself errors
    console.error('submissionGuard error:', error.message);
    next();
  }
};