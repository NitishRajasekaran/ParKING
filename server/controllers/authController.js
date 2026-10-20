import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
let adminSetupInProgress = false;

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const getAdminSetupStatus = async (_req, res) => {
  try {
    const available = !(await User.exists({ role: { $in: ['admin', 'platform_admin'] } }));
    res.json({ available });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const setupFirstAdmin = async (req, res) => {
  if (adminSetupInProgress) return res.status(409).json({ message: 'Admin setup is already in progress' });
  adminSetupInProgress = true;
  try {
    const body = req.body ?? {};
    if (Object.hasOwn(body, 'role')) return res.status(400).json({ message: 'role is not accepted by this endpoint' });
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;
    if (!name || !email || typeof password !== 'string')
      return res.status(400).json({ message: 'name, email and password are required' });
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });
    if (await User.exists({ role: { $in: ['admin', 'platform_admin'] } }))
      return res.status(409).json({ message: 'Admin setup is already complete' });
    if (await User.exists({ email }))
      return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: 'platform_admin' });
    return res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    return res.status(500).json({ message: err.message });
  } finally {
    adminSetupInProgress = false;
  }
};

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

export const register = async (req, res) => {
  try {
    const body = req.body ?? {};
    if (
      Object.hasOwn(body, 'role') ||
      Object.hasOwn(body, 'ownerStatus') ||
      Object.hasOwn(body, 'status') ||
      Object.hasOwn(body, 'assignedLots') ||
      Object.hasOwn(body, 'ownerId')
    ) {
      return res.status(400).json({ message: 'role and status fields are not accepted by this endpoint' });
    }
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;
    if (!name || !email || typeof password !== 'string')
      return res.status(400).json({ message: 'name, email and password are required' });
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });

    if (await User.exists({ email }))
      return res.status(409).json({ message: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: 'driver', ownerStatus: 'none' });

    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
};

export const applyOwner = async (req, res) => {
  try {
    const body = req.body ?? {};
    if (
      Object.hasOwn(body, 'role') ||
      Object.hasOwn(body, 'ownerStatus') ||
      Object.hasOwn(body, 'status') ||
      Object.hasOwn(body, 'assignedLots') ||
      Object.hasOwn(body, 'ownerId')
    ) {
      return res.status(400).json({ message: 'role and status fields are not accepted by this endpoint' });
    }

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;

    if (!name || !email || typeof password !== 'string') {
      return res.status(400).json({ message: 'name, email and password are required' });
    }
    if (!validEmail(email)) return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters' });

    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: 'owner',
      ownerStatus: 'pending',
    });

    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
};

export const getOwnerApplicationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('_id name email role ownerStatus createdAt updatedAt');
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'platform_admin' || user.role === 'admin') {
      return res.json({
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        ownerStatus: 'approved',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    }
    if (user.role !== 'owner') {
      return res.status(403).json({ message: 'Only owner accounts have an application status' });
    }
    res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      ownerStatus: user.ownerStatus,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;
    if (!email || typeof password !== 'string')
      return res.status(400).json({ message: 'email and password are required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    res.json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = (req, res) => res.json(req.user);

export const forgotPassword = async (req, res) => {
  try {
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = body.password;
    if (!email || typeof password !== 'string')
      return res.status(400).json({ message: 'email and new password are required' });
    if (!validEmail(email))
      return res.status(400).json({ message: 'Enter a valid email address' });
    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    user.passwordHash = passwordHash;
    await user.save();

    res.json({ message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
