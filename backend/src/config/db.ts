import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { User } from '../models';
import bcrypt from 'bcryptjs';

let mongod: any = null;

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
      });
    }
    console.log('✅ Default accounts ready (admin/admin123, guest/guest123)');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

const connectDB = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      let uri = process.env.MONGODB_URI;

      if (!uri || uri.includes('localhost') || uri.includes('127.0.0.1')) {
        console.log(`⚠️ Using Persistent In-Memory MongoDB (./db-data-v2) - Attempt ${6 - retries}`);
        mongod = await MongoMemoryServer.create({
          instance: {
            dbPath: './db-data-v2',
            storageEngine: 'wiredTiger',
          },
        });
        uri = mongod.getUri();
      }

      const safeUri = uri || '';
      const finalUri = safeUri.includes('?') ? `${safeUri}&retryWrites=false` : `${safeUri}?retryWrites=false`;
      console.log(`🔌 Connecting to: ${finalUri}`);
      const conn = await mongoose.connect(finalUri, {
        retryWrites: false
      } as any);
      console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
      
      // Auto-seed initial users
      await seedInitialUsers();
      return; // Success
      
    } catch (error: any) {
      console.error(`❌ Connection Attempt Failed: ${error.message}`);
      if (error.message.includes('DBPathInUse')) {
        console.log('🔄 Lock file detected. This usually happens on rapid restarts. Retrying in 2s...');
        retries--;
        await new Promise(resolve => setTimeout(resolve, 2000));
      } else {
        process.exit(1);
      }
    }
  }
  console.error('❌ Could not connect to MongoDB after multiple attempts.');
  process.exit(1);
};

export default connectDB;
