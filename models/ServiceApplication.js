import mongoose from 'mongoose';

// ─── Design note ──────────────────────────────────────────────────────────────
// Service applications can be submitted by:
//   (a) Anonymous citizens (no User account) — identified by phone + trackingNumber
//   (b) Authenticated staff (future feature)
//
// Therefore:
//   - `user` is optional (not required)
//   - `applicantDetails.idNumber` is optional (citizens may not provide it)
//   - `applicantDetails.phone` is required (primary citizen identifier)

const serviceApplicationSchema = new mongoose.Schema({
  applicationNumber: {
    type: String,
    unique: true,
    index: true,
  },

  // ── Optional link to a staff User account ──────────────────────────────────
  // NOT required — public (unauthenticated) submissions are allowed.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,   // ← was `required: true` — fixed
    default: null,
  },

  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: [true, 'Service reference is required'],
    index: true,
  },

  serviceName: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
  },

  category: {
    type: String,
    required: [true, 'Category is required'],
  },

  // ── Citizen contact details (no User account needed) ───────────────────────
  applicantDetails: {
    name: {
      type: String,
      required: [true, 'Applicant name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    idNumber: {
      type: String,
      required: false,   // ← was `required: true` — fixed
      trim: true,
      default: '',
    },
    address: {
      street:  { type: String, default: '' },
      city:    { type: String, default: '' },
      ward:    { type: String, default: '' },
    },
  },

  // ── Flexible payload for service-specific fields ────────────────────────────
  applicationData: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },

  // ── Uploaded supporting documents ──────────────────────────────────────────
  attachments: [
    {
      filename: String,
      path:     String,
      mimetype: String,
      size:     Number,
    },
  ],

  // ── Workflow status ─────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'processing', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  },

  // ── Payment ─────────────────────────────────────────────────────────────────
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'not-required', 'refunded'],
    default: 'pending',
  },
  paymentDetails: {
    amount:        { type: Number, default: 0 },
    transactionId: String,
    paymentMethod: String,
    paidAt:        Date,
    receipt:       String,
  },
  fee: {
    type: Number,
    default: 0,
  },

  // ── Staff handling ──────────────────────────────────────────────────────────
  remarks:       String,
  officerNotes:  String,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  processedAt: Date,
  completedAt: Date,

  // ── Audit trail ─────────────────────────────────────────────────────────────
  trackingHistory: [
    {
      status:    String,
      remarks:   String,
      timestamp: { type: Date, default: Date.now },
      updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
      },
    },
  ],
}, {
  timestamps: true,
});

// ── Auto-generate applicationNumber before save ────────────────────────────
serviceApplicationSchema.pre('save', async function (next) {
  if (!this.applicationNumber) {
    const year   = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1_000_000)
      .toString()
      .padStart(6, '0');
    this.applicationNumber = `APP/${year}/${random}`;
  }

  // Append to tracking history when status changes
  if (this.isModified('status')) {
    this.trackingHistory.push({
      status:    this.status,
      remarks:   this.remarks,
      updatedBy: this.processedBy ?? null,
      timestamp: new Date(),
    });
  }

  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }

  next();
});

// ── Index for submission-guard duplicate check (phone + service + date) ────
serviceApplicationSchema.index(
  { 'applicantDetails.phone': 1, status: 1, createdAt: -1 }
);

export default mongoose.model('ServiceApplication', serviceApplicationSchema);