import { body } from 'express-validator';

export const complaintValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ max: 200 }).withMessage('Title cannot exceed 200 characters'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn([
      'Infrastructure', 'Water & Sanitation', 'Healthcare', 'Education',
      'Environment', 'Land & Housing', 'Revenue & Taxation', 'Transport',
      'Agriculture', 'Social Services', 'Other'
    ]).withMessage('Invalid category'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 5000 }).withMessage('Description must be between 20 and 5000 characters'),
  
  body('location.ward')
    .notEmpty().withMessage('Ward is required'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
];