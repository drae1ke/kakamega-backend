import Service from '../models/Service.js';
import ServiceApplication from '../models/ServiceApplication.js';
import AppError from '../utils/AppError.js';
import { catchAsync } from '../utils/catchAsync.js';
import { sendEmail } from '../utils/emailService.js';
import { generateTrackingNumber } from '../utils/helpers.js';

// ==================== SERVICE MANAGEMENT ====================

export const getAllServices = catchAsync(async (req, res, next) => {
  const { category, department, isAvailable, search, page = 1, limit = 10 } = req.query;

  const query = {};
  if (category) query.category = category;
  if (department) query.department = department;
  if (isAvailable !== undefined) query.isAvailable = isAvailable === 'true';
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const services = await Service.find(query)
    .sort('name')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await Service.countDocuments(query);

  res.status(200).json({
    success: true,
    count: services.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: { services },
  });
});

export const getServiceById = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { service },
  });
});

export const createService = catchAsync(async (req, res, next) => {
  const existingService = await Service.findOne({ name: req.body.name });
  if (existingService) {
    return next(new AppError('A service with this name already exists', 400));
  }

  const service = await Service.create(req.body);

  res.status(201).json({
    success: true,
    data: { service },
  });
});

export const updateService = catchAsync(async (req, res, next) => {
  let service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  if (req.body.name && req.body.name !== service.name) {
    const existingService = await Service.findOne({ name: req.body.name });
    if (existingService) {
      return next(new AppError('A service with this name already exists', 400));
    }
  }

  service = await Service.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: { service },
  });
});

export const deleteService = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  const pendingApplications = await ServiceApplication.countDocuments({
    service: service.id,
    status: { $in: ['pending', 'processing'] }
  });

  if (pendingApplications > 0) {
    return next(new AppError(`Cannot delete service with ${pendingApplications} pending applications. Consider making it unavailable instead.`, 400));
  }

  await service.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Service deleted successfully',
  });
});

export const getServiceCategories = catchAsync(async (req, res, next) => {
  const categories = [
    'Birth Certificate', 'Death Certificate', 'Marriage Certificate',
    'Business Permit', 'Land Rates', 'Building Permit',
    'Health Services', 'Education Services', 'Social Services',
    'Water Connection', 'Electricity Connection', 'Other'
  ];

  res.status(200).json({
    success: true,
    data: { categories },
  });
});

export const getServicesByDepartment = catchAsync(async (req, res, next) => {
  const { department } = req.params;
  
  const services = await Service.find({ 
    department: { $regex: new RegExp(department, 'i') },
    isAvailable: true 
  }).sort('name');

  res.status(200).json({
    success: true,
    count: services.length,
    data: { services },
  });
});

export const getDepartments = catchAsync(async (req, res, next) => {
  const departments = [
    'Public Works', 'Water & Sanitation', 'Health Services', 'Education',
    'Environment', 'Lands & Housing', 'Finance', 'Transport',
    'Agriculture', 'Social Services', 'General Administration'
  ];

  res.status(200).json({
    success: true,
    data: { departments },
  });
});

// ==================== SERVICE APPLICATIONS ====================


export const applyForService = catchAsync(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new AppError('Service not found', 404));
  }

  if (!service.isAvailable) {
    return next(new AppError('This service is currently unavailable', 400));
  }

  const {
    fullName,
    phoneNumber,
    email,
    applicantDetails,
    applicationData,
  } = req.body;

  // Validate minimum required fields
  if (!fullName || !phoneNumber) {
    return next(new AppError('Full name and phone number are required', 400));
  }

  // Build the document — no `user` field for public (unauthenticated) submissions
  const newApplication = {
    // applicationNumber is auto-generated in the pre-save hook
    service:     service._id,
    serviceName: service.name,
    category:    service.category,

    applicantDetails: {
      name:     fullName,
      email:    email || '',
      phone:    phoneNumber,
      idNumber: applicantDetails?.idNumber || '',   // optional — no longer required
      address:  applicantDetails?.address  || {},
    },

    applicationData: applicationData || {},

    fee:           service.fee,
    paymentStatus: service.fee > 0 ? 'pending' : 'not-required',
    status:        'pending',

    attachments: req.files
      ? req.files.map((file) => ({
          filename: file.originalname,
          path:     file.path,
          mimetype: file.mimetype,
          size:     file.size,
        }))
      : [],

    // user is intentionally omitted — not required for public submissions
  };

  const application = await ServiceApplication.create(newApplication);

  // Send confirmation email if provided (non-blocking)
  if (email) {
    sendEmail({
      email,
      subject: `Application Received: ${service.name}`,
      template: 'applicationConfirmation',
      data: {
        name:        fullName,
        serviceName: service.name,
        applicationId: application.applicationNumber,
        fee:         service.fee,
      },
    }).catch((err) =>
      console.error('[email] applicationConfirmation failed:', err.message)
    );
  }

  res.status(201).json({
    success: true,
    message: 'Application submitted successfully',
    data: {
      applicationNumber: application.applicationNumber,
      serviceName:       service.name,
      status:            'pending',
      fee:               service.fee,
      paymentStatus:     service.fee > 0 ? 'pending' : 'not-required',
      createdAt:         application.createdAt,
    },
  });
});

export const trackApplication = catchAsync(async (req, res, next) => {
  const { trackingNumber } = req.params;

  const application = await ServiceApplication.findOne({ applicationNumber: trackingNumber })
    .populate('service', 'name category processingTime');

  if (!application) {
    return next(new AppError('Application not found. Please check your tracking number.', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      applicationNumber: application.applicationNumber,
      status: application.status,
      serviceName: application.serviceName,
      category: application.category,
      submittedAt: application.createdAt,
      lastUpdated: application.updatedAt,
      remarks: application.remarks,
      paymentStatus: application.paymentStatus,
      fee: application.fee,
      processedAt: application.processedAt,
      completedAt: application.completedAt,
    },
  });
});

export const getUserApplications = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const query = {};
  if (status) query.status = status;

  const applications = await ServiceApplication.find(query)
    .populate('service', 'name category processingTime')
    .sort('-createdAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await ServiceApplication.countDocuments(query);

  res.status(200).json({
    success: true,
    count: applications.length,
    total,
    pages: Math.ceil(total / limit),
    currentPage: parseInt(page),
    data: { applications },
  });
});

export const getServiceApplicationById = catchAsync(async (req, res, next) => {
  const application = await ServiceApplication.findById(req.params.applicationId)
    .populate('user', 'name email phone idNumber')
    .populate('service', 'name category processingTime fee requirements');

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { application },
  });
});

export const updateApplicationStatus = catchAsync(async (req, res, next) => {
  const { status, remarks, officerNotes } = req.body;
  
  const application = await ServiceApplication.findById(req.params.applicationId)
    .populate('service', 'name');

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  application.status = status;
  application.remarks = remarks;
  application.officerNotes = officerNotes;
  application.processedBy = req.user.id;
  application.processedAt = Date.now();

  await application.save();

  if (application.applicantDetails.email) {
    await sendEmail({
      email: application.applicantDetails.email,
      subject: `Application Status Update: ${application.serviceName}`,
      template: 'applicationStatusUpdate',
      data: {
        name: application.applicantDetails.name,
        serviceName: application.serviceName,
        applicationId: application.applicationNumber,
        status: status,
        remarks: remarks,
      },
    });
  }

  res.status(200).json({
    success: true,
    data: { application },
  });
});

export const updatePaymentStatus = catchAsync(async (req, res, next) => {
  const { paymentStatus, transactionId, paymentMethod } = req.body;
  
  const application = await ServiceApplication.findById(req.params.applicationId);

  if (!application) {
    return next(new AppError('Application not found', 404));
  }

  application.paymentStatus = paymentStatus;
  if (transactionId) {
    application.paymentDetails = {
      ...application.paymentDetails,
      transactionId,
      paymentMethod,
      paidAt: paymentStatus === 'paid' ? Date.now() : undefined,
    };
  }

  await application.save();

  res.status(200).json({
    success: true,
    data: { application },
  });
});

export const getServiceStats = catchAsync(async (req, res, next) => {
  const [
    totalServices,
    activeServices,
    servicesByCategory,
    applicationsByStatus,
    recentApplications,
  ] = await Promise.all([
    Service.countDocuments(),
    Service.countDocuments({ isAvailable: true }),
    Service.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    ServiceApplication.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    ServiceApplication.find()
      .sort('-createdAt')
      .limit(10)
      .populate('service', 'name'),
  ]);

  const completedApps = await ServiceApplication.find({
    status: 'completed',
    processedAt: { $exists: true }
  });

  let avgProcessingTime = 0;
  if (completedApps.length > 0) {
    const totalTime = completedApps.reduce((acc, app) => {
      const processingTime = app.processedAt - app.createdAt;
      return acc + processingTime;
    }, 0);
    avgProcessingTime = totalTime / completedApps.length / (1000 * 60 * 60 * 24);
  }

  res.status(200).json({
    success: true,
    data: {
      totalServices,
      activeServices,
      servicesByCategory,
      totalApplications: applicationsByStatus.reduce((acc, curr) => acc + curr.count, 0),
      applicationsByStatus,
      recentApplications,
      avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
    },
  });
});

export const bulkUpdateServiceStatus = catchAsync(async (req, res, next) => {
  const { serviceIds, isAvailable } = req.body;

  if (!serviceIds || !Array.isArray(serviceIds)) {
    return next(new AppError('Please provide an array of service IDs', 400));
  }

  const result = await Service.updateMany(
    { _id: { $in: serviceIds } },
    { isAvailable },
    { new: true }
  );

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} services updated successfully`,
    data: { modifiedCount: result.modifiedCount },
  });
});