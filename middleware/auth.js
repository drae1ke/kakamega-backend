import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';
import AppError from '../utils/AppError.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('Protect middleware: token present:', !!token);

    if (!token) {
      return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    console.log('Decoded token:', decoded);

    const user = await User.findById(decoded.id).select('-password');
    console.log('User found:', !!user, user ? user.name : 'none');

    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 401));
    }

    req.user = user;
    console.log('req.user set:', req.user.name);
    next();
  } catch (error) {
    console.log('Protect error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token. Please log in again.', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Your token has expired. Please log in again.', 401));
    }
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware: req.user:', req.user ? req.user.name : 'undefined', 'roles:', roles);
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError(`User role ${req.user.role} is not authorized to access this route`, 403));
    }
    next();
  };
};