import mongoose from 'mongoose';

// ─── IMPORTANT: These enum values must match what the frontend sends ──────────
// Frontend mockData.ts serviceCategories use these category strings:
//   "Water & Sanitation", "Infrastructure", "Health", "Education",
//   "Environment", "Security"
//
// The old model had mismatched values like "Birth Certificate", "Death Certificate"
// which caused "Could not find matching service" errors.

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a service name'],
    trim: true,
    unique: true,
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    enum: {
      values: [
        // ── Core public services (match frontend mockData.ts) ─────────────
        'Water & Sanitation',
        'Infrastructure',
        'Health',
        'Education',
        'Environment',
        'Security',
        // ── Additional county services ────────────────────────────────────
        'Agriculture',
        'Social Services',
        'Land & Housing',
        'Finance',
        'Transport',
        'General Administration',
      ],
      message: '"{VALUE}" is not a valid service category. Must be one of the defined values.',
    },
  },
  description: {
    type: String,
    required: [true, 'Please provide service description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  requirements: [
    {
      type: String,
      trim: true,
    },
  ],
  processingTime: {
    type: String,
    required: [true, 'Please provide estimated processing time'],
  },
  fee: {
    type: Number,
    default: 0,
    min: [0, 'Fee cannot be negative'],
  },
  department: {
    type: String,
    required: [true, 'Please provide responsible department'],
    enum: [
      'Public Works',
      'Water & Sanitation',
      'Health Services',
      'Education',
      'Environment',
      'Lands & Housing',
      'Finance',
      'Transport',
      'Agriculture',
      'Social Services',
      'General Administration',
    ],
  },
  isAvailable: {
    type: Boolean,
    default: true,
    index: true,
  },
}, {
  timestamps: true,
});

// Index for fast category + availability lookups (used by getServiceIdByCategory)
serviceSchema.index({ category: 1, isAvailable: 1 });

export default mongoose.model('Service', serviceSchema);