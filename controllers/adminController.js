import mongoose from 'mongoose';
import User from '../models/User.js';
import Complaint from '../models/Complaint.js';
import Service from '../models/Service.js';
import ServiceApplication from '../models/ServiceApplication.js';
import { catchAsync } from '../utils/catchAsync.js';

const normalizeComplaintRequest = (complaint) => ({
  ...complaint,
  type: 'complaint',
  trackingNumber: complaint.trackingNumber,
  title: complaint.title,
  requesterName: complaint.fullName,
  requesterPhone: complaint.phoneNumber,
  submittedAt: complaint.createdAt,
});

const normalizeApplicationRequest = (application) => ({
  ...application,
  type: 'application',
  trackingNumber: application.applicationNumber,
  title: application.serviceName,
  requesterName: application.applicantDetails?.name,
  requesterPhone: application.applicantDetails?.phone,
  submittedAt: application.createdAt,
});

export const getDashboardStats = catchAsync(async (req, res, next) => {
  const [
    totalUsers,
    totalComplaints,
    pendingComplaints,
    inProgressComplaints,
    resolvedComplaints,
    totalApplications,
    pendingApplications,
    processingApplications,
    completedApplications,
    totalServices,
    complaintsByCategory,
    complaintsByWard,
    complaintsByPriority,
    applicationsByStatus,
  ] = await Promise.all([
    User.countDocuments(),
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: 'pending' }),
    Complaint.countDocuments({ status: 'in-progress' }),
    Complaint.countDocuments({ status: 'resolved' }),
    ServiceApplication.countDocuments(),
    ServiceApplication.countDocuments({ status: 'pending' }),
    ServiceApplication.countDocuments({ status: 'processing' }),
    ServiceApplication.countDocuments({ status: 'completed' }),
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
    ServiceApplication.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
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
      totalApplications,
      totalRequests: totalComplaints + totalApplications,
      pendingComplaints,
      inProgressComplaints,
      resolvedComplaints,
      pendingApplications,
      processingApplications,
      completedApplications,
      totalServices,
      avgResolutionTime: Math.round(avgResolutionTime * 10) / 10,
      complaintsByCategory,
      complaintsByWard,
      complaintsByPriority,
      applicationsByStatus,
    },
  });
});

export const getRecentActivity = catchAsync(async (req, res, next) => {
  const [recentComplaints, recentApplications, recentUsers] = await Promise.all([
    Complaint.find()
      .sort('-createdAt')
      .limit(10)
      .populate('user', 'name email')
      .lean(),
    ServiceApplication.find()
      .sort('-createdAt')
      .limit(10)
      .populate('service', 'name category')
      .lean(),
    User.find()
      .select('-password')
      .sort('-createdAt')
      .limit(10)
      .lean(),
  ]);

  const recentRequests = [
    ...recentComplaints.map(normalizeComplaintRequest),
    ...recentApplications.map(normalizeApplicationRequest),
  ]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .slice(0, 10);

  res.status(200).json({
    success: true,
    data: {
      recentComplaints,
      recentApplications,
      recentRequests,
      recentUsers,
    },
  });
});

export const getAllRequests = catchAsync(async (req, res, next) => {
  const { type = 'all', status, search, page = 1, limit = 20 } = req.query;
  const currentPage = Math.max(parseInt(page, 10) || 1, 1);
  const perPage = Math.max(parseInt(limit, 10) || 20, 1);

  const complaintQuery = {};
  const applicationQuery = {};

  if (status) {
    complaintQuery.status = status;
    applicationQuery.status = status;
  }

  if (search) {
    const regex = { $regex: search, $options: 'i' };
    complaintQuery.$or = [
      { trackingNumber: regex },
      { title: regex },
      { fullName: regex },
      { phoneNumber: regex },
      { category: regex },
    ];
    applicationQuery.$or = [
      { applicationNumber: regex },
      { serviceName: regex },
      { 'applicantDetails.name': regex },
      { 'applicantDetails.phone': regex },
      { category: regex },
    ];
  }

  const includeComplaints = type === 'all' || type === 'complaint' || type === 'complaints';
  const includeApplications = type === 'all' || type === 'application' || type === 'applications';

  const [complaints, applications, complaintTotal, applicationTotal] = await Promise.all([
    includeComplaints
      ? Complaint.find(complaintQuery).sort('-createdAt').populate('assignedTo', 'name department').lean()
      : [],
    includeApplications
      ? ServiceApplication.find(applicationQuery).sort('-createdAt').populate('service', 'name category').lean()
      : [],
    includeComplaints ? Complaint.countDocuments(complaintQuery) : 0,
    includeApplications ? ServiceApplication.countDocuments(applicationQuery) : 0,
  ]);

  const requests = [
    ...complaints.map(normalizeComplaintRequest),
    ...applications.map(normalizeApplicationRequest),
  ].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  const total = complaintTotal + applicationTotal;
  const pagedRequests = requests.slice((currentPage - 1) * perPage, currentPage * perPage);

  res.status(200).json({
    success: true,
    count: pagedRequests.length,
    total,
    pages: Math.ceil(total / perPage),
    currentPage,
    data: { requests: pagedRequests },
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
