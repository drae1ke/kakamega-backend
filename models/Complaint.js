import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({

  // ── Citizen contact info (no User account required) ─────────────────────
  // Stored directly on the complaint. Not linked to a User document.
  fullName: {
    type:     String,
    required: [true, 'Please provide your full name'],
    trim:     true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  phoneNumber: {
    type:     String,
    required: [true, 'Please provide a phone number'],
    trim:     true,
  },
  email: {
    type:      String,
    lowercase: true,
    trim:      true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email',
    ],
  },

  // ── Tracking ─────────────────────────────────────────────────────────────
  trackingNumber: {
    type:     String,
    unique:   true,
    required: true,
    index:    true,
  },

  // ── Complaint content ─────────────────────────────────────────────────────
  title: {
    type:      String,
    required:  [true, 'Please provide a complaint title'],
    trim:      true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  category: {
    type:     String,
    required: true,
    enum: [
      'Infrastructure',
      'Water & Sanitation',
      'Health',
      'Education',
      'Environment',
      'Security',
      'Land & Housing',
      'Revenue & Taxation',
      'Transport',
      'Agriculture',
      'Social Services',
      'Other',
    ],
  },
  description: {
    type:      String,
    required:  [true, 'Please provide a description'],
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
  },

  // ── Location ──────────────────────────────────────────────────────────────
  location: {
    ward:             { type: String, required: true },
    subcounty:        { type: String, required: true },
    subLocation:      String,
    village:          String,
    specificLocation: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },

  // ── Attachments (uploaded by citizen) ────────────────────────────────────
  attachments: [{
    filename: String,
    path:     String,
    mimetype: String,
    size:     Number,
  }],

  // ── Workflow ──────────────────────────────────────────────────────────────
  status: {
    type:    String,
    enum:    ['pending', 'in-review', 'in-progress', 'resolved', 'closed', 'rejected'],
    default: 'pending',
    index:   true,
  },
  priority: {
    type:    String,
    enum:    ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
    index:   true,
  },

  // ── Staff assignment (internal, not exposed to citizens) ─────────────────
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
  },
  department: {
    type: String,
    enum: [
      'Public Works', 'Water & Sanitation', 'Health Services', 'Education',
      'Environment', 'Lands & Housing', 'Finance', 'Transport',
      'Agriculture', 'Social Services', 'General Administration',
    ],
  },

  // ── Resolution (partial info surfaced to citizen via trackComplaint) ──────
  feedback:        String,  // shown to citizen when resolved
  resolutionNotes: String,  // internal staff notes, NOT shown to citizen
  resolvedAt:      Date,

}, {
  timestamps: true, // adds createdAt, updatedAt
});

// ── Indexes for common query patterns ──────────────────────────────────────
complaintSchema.index({ phoneNumber: 1, status: 1, createdAt: -1 });
complaintSchema.index({ 'location.ward': 1, category: 1 });
complaintSchema.index({ status: 1, priority: -1, createdAt: -1 });

// Add to complaintSchema before exporting
complaintSchema.pre('save', async function(next) {
  if (!this.trackingNumber) {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    this.trackingNumber = `CMP/${year}/${random}`;
  }
  next();
});

export default mongoose.model('Complaint', complaintSchema);