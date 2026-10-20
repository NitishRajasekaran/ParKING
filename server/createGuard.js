import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const createGuard = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'guard@parking.com';
    const password = 'Guard@123';

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log('Guard already exists.');
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: 'ParKING Guard',
      email,
      passwordHash,
      role: 'guard',
    });

    console.log('Guard created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);

    process.exit(0);
  } catch (error) {
    console.error('Failed to create guard:', error.message);
    process.exit(1);
  }
};

createGuard();