import rateLimit from 'express-rate-limit';

// ─── Public limiter ──────────────────────────────────────────────────────────
// Applied to citizen-facing endpoints (complaint submission, service application,
// tracking). Generous enough for legitimate use, tight enough to deter abuse.

export const publicLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10,                   // 10 submissions per IP per hour
  message: {
    success: false,
    error: 'Too many requests from your network. Please try again in an hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by IP address only (citizens have no user id)
  keyGenerator: (req) => req.ip,
  skip: (req) => {
    // Skip rate limiting for GET requests to /track (read-only, low-risk)
    return req.method === 'GET';
  },
});

// ─── Auth limiter ────────────────────────────────────────────────────────────
// Strict limit on login attempts to prevent brute-force attacks.

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,                    // 5 login attempts per IP
  message: {
    success: false,
    error: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Staff limiter ───────────────────────────────────────────────────────────
// Applied to authenticated staff/admin write operations.
// Much more generous since staff are trusted, authenticated users.

export const staffLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // 100 requests per 15 min per staff member
  message: {
    success: false,
    error: 'Rate limit exceeded. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Key by user ID once authenticated, otherwise IP
  keyGenerator: (req) => req.user?.id || req.ip,
});