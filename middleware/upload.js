import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import AppError from '../utils/AppError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const createUploadDir = (dir) => {
  const fullPath = path.join(__dirname, '../uploads', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
};

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'general';
    
    // Determine folder based on route or file type
    if (req.baseUrl.includes('complaints')) {
      folder = 'complaints';
    } else if (req.baseUrl.includes('services')) {
      folder = 'applications';
    } else if (req.baseUrl.includes('users')) {
      folder = 'profiles';
    }
    
    const uploadPath = createUploadDir(folder);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type. Only images and PDFs are allowed.', 400), false);
  }
};

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Specific upload configurations
export const uploadProfileImage = upload.single('profileImage');
export const uploadComplaintAttachments = upload.array('attachments', 5);
export const uploadApplicationDocuments = upload.array('documents', 5);

// Clean up old files (optional utility)
export const cleanupOldFiles = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) console.error('Error deleting file:', err);
    });
  }
};