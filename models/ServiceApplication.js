import mongoose from 'mongoose';

const serviceApplicationSchema = new mongoose.Schema({
  applicationNumber: {
    type: String,
    unique: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  serviceName: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
  applicantDetails: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    idNumber: { type: String, required: true },
    address: {
      street: String,
      city: String,
      ward: String,
    },
  },
  applicationData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
  }],
  status: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'not-required', 'refunded'],
    default: 'pending',
  },
  paymentDetails: {
    amount: Number,
    transactionId: String,
    paymentMethod: String,
    paidAt: Date,
    receipt: String,
  },
  fee: {
    type: Number,
    default: 0,
  },
  remarks: String,
  officerNotes: String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  processedAt: Date,
  completedAt: Date,
  trackingHistory: [{
    status: String,
    remarks: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
}, {
  timestamps: true,
});

// Add to serviceApplicationSchema before exporting
serviceApplicationSchema.pre('save', async function(next) {
  if (!this.applicationNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    this.applicationNumber = `APP/${year}/${random}`;
  }
  
  // Add to tracking history when status changes
  if (this.isModified('status')) {
    this.trackingHistory.push({
      status: this.status,
      remarks: this.remarks,
      updatedBy: this.processedBy,
    });
  }
  
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = Date.now();
  }
  
  next();
});

export default mongoose.model('ServiceApplication', serviceApplicationSchema);