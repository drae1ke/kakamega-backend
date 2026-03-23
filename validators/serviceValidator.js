import { body } from 'express-validator';

export const serviceValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Service name is required')
    .isLength({ min: 3, max: 100 }).withMessage('Service name must be between 3 and 100 characters'),
  
  body('category')
    .notEmpty().withMessage('Category is required')
    .isIn([
      'Birth Certificate', 'Death Certificate', 'Marriage Certificate',
      'Business Permit', 'Land Rates', 'Building Permit',
      'Health Services', 'Education Services', 'Social Services',
      'Water Connection', 'Electricity Connection', 'Other'
    ]).withMessage('Invalid category'),
  
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 20, max: 1000 }).withMessage('Description must be between 20 and 1000 characters'),
  
  body('requirements')
    .isArray().withMessage('Requirements must be an array')
    .notEmpty().withMessage('At least one requirement is required'),
  
  body('processingTime')
    .trim()
    .notEmpty().withMessage('Processing time is required'),
  
  body('fee')
    .isNumeric().withMessage('Fee must be a number')
    .isFloat({ min: 0 }).withMessage('Fee cannot be negative'),
  
  body('department')
    .trim()
    .notEmpty().withMessage('Department is required'),
];

export const applicationValidator = [
  body('applicantDetails.address')
    .optional(),
  
  body('applicationData')
    .isObject().withMessage('Application data must be provided'),
  
  body('paymentMethod')
    .optional()
    .isIn(['mpesa', 'bank', 'card', 'cash']).withMessage('Invalid payment method'),
];