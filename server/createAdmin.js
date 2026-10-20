import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';

dotenv.config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = 'admin@parking.com';
    const password = 'Admin@123';

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      console.log('Admin already exists.');
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: 'ParKING Admin',
      email,
      passwordHash,
      role: 'admin',
    });

    console.log('Admin created successfully!');
    console.log('Email:', email);
    console.log('Password:', password);

    process.exit(0);
  } catch (error) {
    console.error('Failed to create admin:', error.message);
    process.exit(1);
  }
};

createAdmin();