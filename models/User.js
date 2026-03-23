import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({

  name: {
    type:      String,
    required:  [true, 'Please provide a name'],
    trim:      true,
    maxlength: [50, 'Name cannot be more than 50 characters'],
  },
  email: {
    type:     String,
    required: [true, 'Please provide an email'],
    unique:   true,
    lowercase: true,
    trim:      true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email',
    ],
  },
  phone: {
    type:     String,
    required: [true, 'Please provide a phone number'],
  },
  idNumber: {
    type:     String,
    required: [true, 'Please provide ID number'],
    unique:   true,
  },
  password: {
    type:      String,
    required:  [true, 'Please provide a password'],
    minlength: 8,
    select:    false,
  },

  // ── Staff roles only ──────────────────────────────────────────────────────
  // No 'user' role - the system does not register citizens.
  // Citizens interact anonymously via phone number + tracking number.
  role: {
    type:    String,
    enum:    ['officer', 'admin'],
    default: 'officer',
  },

  // ── Staff assignment context ──────────────────────────────────────────────
  department: {
    type: String,
    enum: [
      'Public Works', 'Water & Sanitation', 'Health Services', 'Education',
      'Environment', 'Lands & Housing', 'Finance', 'Transport',
      'Agriculture', 'Social Services', 'General Administration',
    ],
  },
  ward: {
    type: String,
  },

  // ── Account state ─────────────────────────────────────────────────────────
  isActive: {
    type:    Boolean,
    default: true,
  },
  // Forces a password change on first login after admin-created account
  mustChangePassword: {
    type:    Boolean,
    default: false,
  },

  // ── Password reset ────────────────────────────────────────────────────────
  resetPasswordToken:  String,
  resetPasswordExpire: Date,

  // ── Audit ─────────────────────────────────────────────────────────────────
  lastLoginAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref:  'User',
  },

}, {
  timestamps: true,
});

// ── Encrypt password before saving ────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ── Compare password ──────────────────────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ── Update lastLoginAt on successful auth ─────────────────────────────────
userSchema.methods.recordLogin = async function () {
  this.lastLoginAt = new Date();
  await this.save({ validateBeforeSave: false });
};

export default mongoose.model('User', userSchema);