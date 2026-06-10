import mongoose from 'mongoose';
import { User } from '../models';
import bcrypt from 'bcryptjs';

async function seedInitialUsers() {
  try {
    const adminExists = await User.findOne({ username: 'admin' });
    if (!adminExists) {
      console.log('🌱 Seeding initial Admin account...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        username: 'admin',
        password: hashedPassword,
        role: 'ADMIN',
        fullName: 'Administrator'
      });
    }

    const guestExists = await User.findOne({ username: 'guest' });
    if (!guestExists) {
      console.log('🌱 Seeding initial Guest account...');
      const guestPassword = await bcrypt.hash('guest123', 10);
      await User.create({
        username: 'guest',
        password: guestPassword,
        role: 'GUEST',
        fullName: 'Guest User'
      });
    }
    console.log('✅ Default accounts ready (admin/admin123, guest/guest123)');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sales-tracker';
    console.log(`🔌 Connecting to MongoDB at: ${uri}`);
    
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Auto-seed initial users
    await seedInitialUsers();
  } catch (error: any) {
    console.error(`❌ Connection Failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;