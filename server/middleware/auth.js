import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Verifies the JWT from the Authorization header and attaches the user to req
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-passwordHash');
    if (!req.user) return res.status(401).json({ message: 'User not found' });
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};

// Use after protect — checks that the authenticated user has one of the required roles
export const authorize = (...roles) => (req, res, next) => {
  const userRole = req.user?.role;
  const hasRole =
    roles.includes(userRole) ||
    (roles.includes('platform_admin') && userRole === 'admin') ||
    (roles.includes('admin') && userRole === 'platform_admin');

  if (!hasRole) {
    return res.status(403).json({ message: 'Forbidden: insufficient permissions' });
  }
  next();
};

// Ensures the authenticated user is an owner whose application has been approved
export const requireApprovedOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (req.user.role === 'platform_admin' || req.user.role === 'admin') {
    return next();
  }
  if (req.user.role !== 'owner') {
    return res.status(403).json({ message: 'Forbidden: owner role required' });
  }
  if (req.user.ownerStatus !== 'approved') {
    return res.status(403).json({
      message: `Forbidden: owner application is ${req.user.ownerStatus || 'pending'}. Approved status required.`,
    });
  }
  next();
};
