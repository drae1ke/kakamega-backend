import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getAllUsers = catchAsync(async (req, res, next) => {
  const { role, ward, isActive, page = 1, limit = 10 } = req.query;

  const query = {};
  if (role) query.role = role;
  if (ward) query.ward = ward;
  if (isActive !== undefined) query.isActive = isActive === 'true';

  const users = await User.find(query)
    .select('-password')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    data: { users },
  });
});

export const getUserById = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check if requesting user is admin or the user themselves
  if (req.user.role !== 'admin' && req.user.id !== user.id) {
    return next(new AppError('You are not authorized to view this user', 403));
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

export const updateUser = catchAsync(async (req, res, next) => {
  const { name, email, phone, ward, role, isActive, profileImage } = req.body;

  // Check if user exists
  let user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check authorization
  if (req.user.role !== 'admin' && req.user.id !== user.id) {
    return next(new AppError('You are not authorized to update this user', 403));
  }

  // Prevent non-admins from changing role
  if (req.user.role !== 'admin' && (role || isActive !== undefined)) {
    return next(new AppError('You are not authorized to change role or status', 403));
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone) updateData.phone = phone;
  if (ward) updateData.ward = ward;
  if (role && req.user.role === 'admin') updateData.role = role;
  if (isActive !== undefined && req.user.role === 'admin') updateData.isActive = isActive;
  if (profileImage) updateData.profileImage = profileImage;

  user = await User.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).select('-password');

  res.status(200).json({
    success: true,
    data: { user },
  });
});

export const deleteUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent admin from deleting themselves
  if (req.user.id === user.id) {
    return next(new AppError('You cannot delete your own account. Please use account deactivation instead.', 400));
  }

  // Check if user has any active complaints
  const activeComplaints = await Complaint.countDocuments({
    user: user.id,
    status: { $nin: ['resolved', 'rejected'] }
  });

  if (activeComplaints > 0) {
    return next(new AppError('Cannot delete user with active complaints. Consider deactivating instead.', 400));
  }

  await user.deleteOne();

  res.status(200).json({
    success: true,
    message: 'User deleted successfully',
  });
});

export const getUserStats = catchAsync(async (req, res, next) => {
  const totalUsers = await User.countDocuments();
  const activeUsers = await User.countDocuments({ isActive: true });
  const admins = await User.countDocuments({ role: 'admin' });
  const officers = await User.countDocuments({ role: 'officer' });

  // Get users per ward
  const usersByWard = await User.aggregate([
    { $group: { _id: '$ward', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      admins,
      officers,
      usersByWard,
    },
  });
});

export const getUserComplaints = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Check authorization
  if (req.user.role !== 'admin' && req.user.id !== user.id) {
    return next(new AppError('You are not authorized to view these complaints', 403));
  }

  const { status, page = 1, limit = 10 } = req.query;
  const query = { user: req.params.id };
  if (status) query.status = status;

  const complaints = await Complaint.find(query)
    .sort('-createdAt')
    .populate('assignedTo', 'name email')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Complaint.countDocuments(query);

  res.status(200).json({
    success: true,
    count: complaints.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
    data: { complaints },
  });
});

export const updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!role || !['user', 'officer', 'admin'].includes(role)) {
    return next(new AppError('Invalid role specified', 400));
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { user },
  });
});

export const toggleUserStatus = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // Prevent admin from deactivating themselves
  if (req.user.id === user.id && !user.isActive) {
    return next(new AppError('You cannot deactivate your own account', 400));
  }

  user.isActive = !user.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    data: { 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    },
    message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
  });
});