import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { config } from '../config/env.js';
import { sendEmail } from '../utils/emailService.js';
import { generateRandomPassword } from '../utils/helpers.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const signToken = (id) =>
  jwt.sign({ id }, config.jwtSecret, { expiresIn: config.jwtExpire });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'strict',
  };

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: { user },
  });
};

// ─── LOGIN ───────────────────────────────────────────────────────────────────
// Public endpoint - but only staff accounts exist, so citizens effectively
// cannot log in even if they try.

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    return next(new AppError('Invalid email or password.', 401));
  }

  if (!user.isActive) {
    return next(
      new AppError('Your account has been deactivated. Please contact the system administrator.', 401)
    );
  }

  // Ensure only staff roles can log in
  if (!['admin', 'officer'].includes(user.role)) {
    return next(new AppError('Access denied. This portal is for county staff only.', 403));
  }

  createSendToken(user, 200, res);
});

// ─── GET ME ──────────────────────────────────────────────────────────────────

export const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

// ─── UPDATE ME ───────────────────────────────────────────────────────────────

export const updateMe = catchAsync(async (req, res, next) => {
  // Prevent staff from escalating their own role
  if (req.body.role || req.body.isActive !== undefined) {
    return next(new AppError('You cannot change your own role or status. Contact an admin.', 403));
  }

  const { name, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.id,
    { name, phone },
    { new: true, runValidators: true }
  ).select('-password');

  res.status(200).json({
    success: true,
    data: { user },
  });
});

// ─── CHANGE PASSWORD ──────────────────────────────────────────────────────────

export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.matchPassword(currentPassword))) {
    return next(new AppError('Current password is incorrect.', 401));
  }

  user.password = newPassword;
  await user.save();

  createSendToken(user, 200, res);
});

// ─── CREATE STAFF ACCOUNT (admin only) ───────────────────────────────────────
// Replaces the old public /register endpoint.
// Only admins can create new officer or admin accounts.
// A temporary password is auto-generated and emailed to the new staff member.

export const createStaffAccount = catchAsync(async (req, res, next) => {
  const { name, email, phone, idNumber, role, ward, department } = req.body;

  // Validate role
  if (!['officer', 'admin'].includes(role)) {
    return next(new AppError('Staff role must be either "officer" or "admin".', 400));
  }

  // Check for duplicates
  const existing = await User.findOne({ $or: [{ email }, { idNumber }] });
  if (existing) {
    return next(
      new AppError(
        `A staff account already exists with this ${existing.email === email ? 'email' : 'ID number'}.`,
        400
      )
    );
  }

  // Generate a secure temporary password
  const temporaryPassword = generateRandomPassword(12);

  const newStaff = await User.create({
    name,
    email,
    phone,
    idNumber,
    password: temporaryPassword,
    role,
    ward,
    department,
    isActive: true,
    mustChangePassword: true, // flag to force password change on first login
  });

  // Email credentials to the new staff member
  try {
    await sendEmail({
      email,
      subject: 'Your Kakamega County Staff Account',
      template: 'staffWelcome',
      data: {
        name,
        email,
        temporaryPassword,
        role,
        portalUrl: config.portalUrl || 'http://localhost:5173/portal',
        createdBy: req.user.name,
      },
    });
  } catch (err) {
    console.error('Failed to send welcome email:', err.message);
    // Don't fail the request - admin can share credentials manually
  }

  newStaff.password = undefined;

  res.status(201).json({
    success: true,
    message: `Staff account created. Credentials sent to ${email}.`,
    data: {
      user: newStaff,
      // Return temp password in response so admin can share manually if email fails
      temporaryPassword,
    },
  });
});

// ─── LIST STAFF ACCOUNTS (admin only) ────────────────────────────────────────

export const listStaffAccounts = catchAsync(async (req, res, next) => {
  const { role, isActive, page = 1, limit = 20 } = req.query;

  const query = {
    role: { $in: ['officer', 'admin'] }, // never expose regular 'user' accounts
  };

  if (role && ['officer', 'admin'].includes(role)) query.role = role;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const staff = await User.find(query)
    .select('-password')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: staff.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: Number(page),
    data: { staff },
  });
});

// ─── DEACTIVATE STAFF ACCOUNT (admin only) ───────────────────────────────────

export const deactivateStaffAccount = catchAsync(async (req, res, next) => {
  const staff = await User.findById(req.params.id);

  if (!staff) return next(new AppError('Staff account not found.', 404));

  if (!['officer', 'admin'].includes(staff.role)) {
    return next(new AppError('This account is not a staff account.', 400));
  }

  if (req.user.id === staff.id) {
    return next(new AppError('You cannot deactivate your own account.', 400));
  }

  // Prevent deactivating the last active admin
  if (staff.role === 'admin') {
    const activeAdmins = await User.countDocuments({ role: 'admin', isActive: true });
    if (activeAdmins <= 1) {
      return next(
        new AppError('Cannot deactivate the last active admin account.', 400)
      );
    }
  }

  staff.isActive = false;
  await staff.save();

  res.status(200).json({
    success: true,
    message: `${staff.name}'s account has been deactivated.`,
    data: {
      user: { id: staff._id, name: staff.name, email: staff.email, isActive: false },
    },
  });
});