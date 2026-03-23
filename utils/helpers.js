import crypto from 'crypto';

// ─── TRACKING NUMBER GENERATOR ──────────────────────────────────────────────
export const generateTrackingNumber = (prefix = 'REF') => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}/${year}/${random}`;
};

// ─── ALTERNATIVE: Generate with timestamp for uniqueness ────────────────────
export const generateTrackingNumberWithTimestamp = (prefix = 'REF') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// ─── Generate a random token ────────────────────────────────────────────────
export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// ─── Generate random password ───────────────────────────────────────────────
export const generateRandomPassword = (length = 12) => {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }
  return password;
};

// ─── Format date to readable string ─────────────────────────────────────────
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ─── Calculate pagination metadata ──────────────────────────────────────────
export const paginate = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const perPage = parseInt(limit) || 10;
  const totalPages = Math.ceil(total / perPage);
  const skip = (currentPage - 1) * perPage;

  return {
    currentPage,
    perPage,
    totalPages,
    total,
    skip,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1,
  };
};

// ─── Sanitize user data (remove sensitive fields) ───────────────────────────
export const sanitizeUser = (user) => {
  const sanitized = user.toObject ? user.toObject() : { ...user };
  delete sanitized.password;
  delete sanitized.resetPasswordToken;
  delete sanitized.resetPasswordExpire;
  delete sanitized.__v;
  return sanitized;
};

// ─── Validate Kenyan phone number ───────────────────────────────────────────
export const isValidKenyanPhone = (phone) => {
  const cleaned = phone.toString().replace(/\D/g, '');
  // Kenyan phone numbers: 07xx xxx xxx, 01xx xxx xxx, or 2547xx xxx xxx
  const kenyanPhoneRegex = /^(?:(?:254|0)(?:7|1)\d{8})$/;
  return kenyanPhoneRegex.test(cleaned);
};

// ─── Format Kenyan phone number to international format ─────────────────────
export const formatKenyanPhone = (phone) => {
  // Remove any non-digit characters
  const cleaned = phone.toString().replace(/\D/g, '');
  
  // Check if it's a valid Kenyan number
  if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
    return `254${cleaned}`;
  }
  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    return `254${cleaned.substring(1)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('254')) {
    return cleaned;
  }
  return phone;
};

// ─── Calculate complaint resolution time in days ────────────────────────────
export const calculateResolutionTime = (createdAt, resolvedAt) => {
  const created = new Date(createdAt);
  const resolved = new Date(resolvedAt);
  const diffTime = Math.abs(resolved - created);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

// ─── Group array by key ─────────────────────────────────────────────────────
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key];
    if (!result[groupKey]) {
      result[groupKey] = [];
    }
    result[groupKey].push(item);
    return result;
  }, {});
};

// ─── Truncate text ──────────────────────────────────────────────────────────
export const truncate = (text, length = 100, suffix = '...') => {
  if (!text) return '';
  if (text.length <= length) return text;
  return text.substring(0, length) + suffix;
};

// ─── Check if object is empty ───────────────────────────────────────────────
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

// ─── Deep clone object ──────────────────────────────────────────────────────
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// ─── Calculate age from date of birth ───────────────────────────────────────
export const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// ─── Generate reference number for payments ─────────────────────────────────
export const generateReferenceNumber = (prefix = 'PAY') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// ─── Mask sensitive data (e.g., phone number) ───────────────────────────────
export const maskPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length < 10) return phone;
  return cleaned.slice(0, 3) + '****' + cleaned.slice(-4);
};

// ─── Mask email address ─────────────────────────────────────────────────────
export const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 3) return `***@${domain}`;
  return `${local.slice(0, 3)}***@${domain}`;
};

// ─── Sleep/delay function (for testing) ─────────────────────────────────────
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// ─── Capitalize first letter of each word ───────────────────────────────────
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// ─── Extract initials from name ─────────────────────────────────────────────
export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ─── Check if a string is a valid UUID ──────────────────────────────────────
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// ─── Get file extension from filename ───────────────────────────────────────
export const getFileExtension = (filename) => {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
};

// ─── Format bytes to human readable ─────────────────────────────────────────
export const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// ─── Generate random OTP (One Time Password) ────────────────────────────────
export const generateOTP = (length = 6) => {
  return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
};

// ─── Check if a date is within the last N days ──────────────────────────────
export const isWithinLastDays = (date, days) => {
  const now = new Date();
  const checkDate = new Date(date);
  const diffTime = Math.abs(now - checkDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days;
};

// ─── Sort array by date field ───────────────────────────────────────────────
export const sortByDate = (array, field = 'createdAt', order = 'desc') => {
  return [...array].sort((a, b) => {
    const dateA = new Date(a[field]);
    const dateB = new Date(b[field]);
    return order === 'desc' ? dateB - dateA : dateA - dateB;
  });
};

// ─── Default export for convenience ─────────────────────────────────────────
export default {
  generateTrackingNumber,
  generateTrackingNumberWithTimestamp,
  generateToken,
  generateRandomPassword,
  formatDate,
  paginate,
  sanitizeUser,
  isValidKenyanPhone,
  formatKenyanPhone,
  calculateResolutionTime,
  groupBy,
  truncate,
  isEmpty,
  deepClone,
  calculateAge,
  generateReferenceNumber,
  maskPhoneNumber,
  maskEmail,
  sleep,
  capitalizeWords,
  getInitials,
  isValidUUID,
  getFileExtension,
  formatBytes,
  generateOTP,
  isWithinLastDays,
  sortByDate,
};