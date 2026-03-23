import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import Service from '../models/Service.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getDashboardStats = catchAsync(async (req, res, next) => {
  const [
    totalUsers,
    totalComplaints,
    pendingComplaints,
    inProgressComplaints,
    resolvedComplaints,
    totalServices,
    complaintsByCategory,
    complaintsByWard,
    complaintsByPriority,
  ] = await Promise.all([
    User.countDocuments(),
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: 'pending' }),
    Complaint.countDocuments({ status: 'in-progress' }),
    Complaint.countDocuments({ status: 'resolved' }),
    Service.countDocuments(),
    Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    Complaint.aggregate([
      { $group: { _id: '$location.ward', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]),
    Complaint.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
  ]);

  // Calculate average resolution time
  const resolvedComplaintsData = await Complaint.find({
    status: 'resolved',
    resolvedAt: { $exists: true }
  }).select('createdAt resolvedAt');

  let avgResolutionTime = 0;
  if (resolvedComplaintsData.length > 0) {
    const totalTime = resolvedComplaintsData.reduce((acc, complaint) => {
      const resolutionTime = complaint.resolvedAt - complaint.createdAt;
      return acc + resolutionTime;
    }, 0);
    avgResolutionTime = totalTime / resolvedComplaintsData.length / (1000 * 60 * 60 * 24); // in days
  }

  res.status(200).json({
    success: true,
    data: {
      totalUsers,
      totalComplaints,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      totalServices,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      complaintsByCategory,
      complaintsByWard,
      complaintsByPriority,
    },
  });
});

export const getRecentActivity = catchAsync(async (req, res, next) => {
  const [recentComplaints, recentUsers] = await Promise.all([
    Complaint.find()
      .sort('-createdAt')
      .limit(10)
      .populate('user', 'name email'),
    User.find()
      .select('-password')
      .sort('-createdAt')
      .limit(10),
  ]);

  res.status(200).json({
    success: true,
    data: {
      recentComplaints,
      recentUsers,
    },
  });
});

export const getSystemHealth = catchAsync(async (req, res, next) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  
  res.status(200).json({
    success: true,
    data: {
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date(),
      memory: process.memoryUsage(),
    },
  });
});