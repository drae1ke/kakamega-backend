import Complaint from '../models/Complaint.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { sendEmail } from '../utils/emailService.js';
import { generateTrackingNumber } from '../utils/helpers.js';

// ─── CREATE COMPLAINT (Public) ──────────────────────────────────────────────
export const createComplaint = catchAsync(async (req, res, next) => {
  const {
    fullName,
    phoneNumber,
    email,
    title,
    category,
    description,
    location,
    priority = 'medium',
  } = req.body;

  // Validate required fields
  if (!fullName || !phoneNumber || !title || !category || !description || !location?.ward) {
    return next(new AppError('Please provide all required fields: fullName, phoneNumber, title, category, description, location.ward', 400));
  }

  // Generate tracking number
  const trackingNumber = generateTrackingNumber('CMP');

  const complaintData = {
    fullName,
    phoneNumber,
    email,
    title,
    category,
    description,
    location: {
      ward: location.ward,
      subcounty: location.subcounty || '',
      subLocation: location.subLocation,
      village: location.village,
      specificLocation: location.specificLocation,
      coordinates: location.coordinates,
    },
    trackingNumber,
    priority,
    status: 'pending',
    attachments: req.files ? req.files.map(file => ({
      filename: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size,
    })) : [],
  };

  const complaint = await Complaint.create(complaintData);

  // Send confirmation email if provided
  if (email) {
    await sendEmail({
      email,
      subject: 'Complaint Received - Kakamega County',
      template: 'complaintConfirmation',
      data: {
        name: fullName,
        trackingNumber,
        category,
        location: `${location.ward}${location.subcounty ? `, ${location.subcounty}` : ''}`,
      },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Complaint submitted successfully',
    data: {
      trackingNumber,
      fullName,
      title,
      category,
      status: 'pending',
      createdAt: complaint.createdAt,
    },
  });
});

// ─── TRACK COMPLAINT BY TRACKING NUMBER (Public) ─────────────────────────────
export const trackComplaint = catchAsync(async (req, res, next) => {
  const { trackingNumber } = req.params;

  const complaint = await Complaint.findOne({ trackingNumber })
    .populate('assignedTo', 'name department')
    .select('-attachments -resolutionNotes -__v');

  if (!complaint) {
    return next(new AppError('Complaint not found. Please check your tracking number.', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      trackingNumber: complaint.trackingNumber,
      status: complaint.status,
      title: complaint.title,
      category: complaint.category,
      description: complaint.description,
      location: complaint.location,
      submittedAt: complaint.createdAt,
      lastUpdated: complaint.updatedAt,
      feedback: complaint.feedback,
      assignedTo: complaint.assignedTo ? {
        name: complaint.assignedTo.name,
        department: complaint.assignedTo.department
      } : null,
      resolvedAt: complaint.status === 'resolved' ? complaint.resolvedAt : null,
    },
  });
});

// ─── GET MY ASSIGNED COMPLAINTS (Staff) ─────────────────────────────────────
export const getMyComplaints = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;

  const query = { assignedTo: req.user.id };
  if (status) query.status = status;

  const complaints = await Complaint.find(query)
    .sort('-createdAt')
    .select('-resolutionNotes')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Complaint.countDocuments(query);

  res.status(200).json({
    success: true,
    count: complaints.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: { complaints },
  });
});

// ─── GET COMPLAINT BY ID (Staff) ────────────────────────────────────────────
export const getComplaintById = catchAsync(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id)
    .populate('assignedTo', 'name email department')
    .select('-resolutionNotes');

  if (!complaint) {
    return next(new AppError('Complaint not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { complaint },
  });
});

// ─── UPDATE COMPLAINT (Staff) ───────────────────────────────────────────────
export const updateComplaint = catchAsync(async (req, res, next) => {
  let complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(new AppError('Complaint not found', 404));
  }

  complaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('assignedTo', 'name department');

  res.status(200).json({
    success: true,
    data: { complaint },
  });
});

// ─── GET ALL COMPLAINTS (Admin/Officer) ─────────────────────────────────────
export const getAllComplaints = catchAsync(async (req, res, next) => {
  const { status, category, priority, ward, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;
  if (category) query.category = category;
  if (priority) query.priority = priority;
  if (ward) query['location.ward'] = ward;

  const complaints = await Complaint.find(query)
    .sort('-createdAt')
    .populate('assignedTo', 'name department')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Complaint.countDocuments(query);

  res.status(200).json({
    success: true,
    count: complaints.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: { complaints },
  });
});

// ─── UPDATE COMPLAINT STATUS (Staff) ────────────────────────────────────────
export const updateComplaintStatus = catchAsync(async (req, res, next) => {
  const { status, feedback, resolutionNotes, assignedTo } = req.body;

  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(new AppError('Complaint not found', 404));
  }

  const updateData = { status };
  if (feedback) updateData.feedback = feedback;
  if (resolutionNotes) updateData.resolutionNotes = resolutionNotes;
  if (assignedTo) updateData.assignedTo = assignedTo;
  if (status === 'resolved') updateData.resolvedAt = Date.now();

  const updatedComplaint = await Complaint.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );

  // Send email notification if citizen provided email
  if (complaint.email && (status !== complaint.status)) {
    await sendEmail({
      email: complaint.email,
      subject: `Complaint Update: ${complaint.trackingNumber}`,
      template: 'complaintUpdate',
      data: {
        name: complaint.fullName,
        trackingNumber: complaint.trackingNumber,
        status,
        feedback: feedback || '',
      },
    });
  }

  res.status(200).json({
    success: true,
    data: { complaint: updatedComplaint },
  });
});

// ─── DELETE COMPLAINT (Admin only) ──────────────────────────────────────────
export const deleteComplaint = catchAsync(async (req, res, next) => {
  const complaint = await Complaint.findById(req.params.id);

  if (!complaint) {
    return next(new AppError('Complaint not found', 404));
  }

  await complaint.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Complaint deleted successfully',
  });
});

// ─── GET COMPLAINT STATS (Admin/Officer) ────────────────────────────────────
export const getComplaintStats = catchAsync(async (req, res, next) => {
  const [
    total,
    pending,
    inReview,
    inProgress,
    resolved,
    byCategory,
    byWard,
    recent
  ] = await Promise.all([
    Complaint.countDocuments(),
    Complaint.countDocuments({ status: 'pending' }),
    Complaint.countDocuments({ status: 'in-review' }),
    Complaint.countDocuments({ status: 'in-progress' }),
    Complaint.countDocuments({ status: 'resolved' }),
    Complaint.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    Complaint.aggregate([
      { $group: { _id: '$location.ward', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    Complaint.find()
      .sort('-createdAt')
      .limit(10)
      .select('trackingNumber title status category createdAt fullName phoneNumber')
  ]);

  res.status(200).json({
    success: true,
    data: {
      total,
      pending,
      inReview,
      inProgress,
      resolved,
      byCategory,
      byWard,
      recent
    }
  });
});