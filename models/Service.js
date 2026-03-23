import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a service name'],
    trim: true,
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Birth Certificate', 'Death Certificate', 'Marriage Certificate',
      'Business Permit', 'Land Rates', 'Building Permit',
      'Health Services', 'Education Services', 'Social Services',
      'Water Connection', 'Electricity Connection', 'Other'
    ],
  },
  description: {
    type: String,
    required: [true, 'Please provide service description'],
  },
  requirements: [{
    type: String,
  }],
  processingTime: {
    type: String,
    required: true,
  },
  fee: {
    type: Number,
    default: 0,
  },
  department: {
    type: String,
    required: true,
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  applicationForm: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Form',
  },
}, {
  timestamps: true,
});

export default mongoose.model('Service', serviceSchema);