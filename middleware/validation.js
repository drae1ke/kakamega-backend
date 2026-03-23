import { validationResult } from 'express-validator';
import AppError from '../utils/AppError.js';

export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors = errors.array().map(err => err.msg);
    next(new AppError(extractedErrors.join(', '), 400));
  };
};