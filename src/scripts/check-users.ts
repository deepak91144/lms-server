import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    const users = await User.find({});
    console.log('--- USERS ---');
    users.forEach(u => {
      console.log(`Email: ${u.email} | Role: ${u.role} | ID: ${u._id}`);
    });
    console.log('-------------');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkUsers();
