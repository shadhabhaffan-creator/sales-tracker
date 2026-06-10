import { prisma } from '../models/prisma';

/**
 * Connects to the database via Prisma.
 * Initial user seeding has been removed — accounts are managed through
 * Supabase Auth and the admin console.
 */
const connectDB = async () => {
  try {
    console.log('🔌 Connecting to Database via Prisma...');
    await prisma.$connect();
    console.log('✅ Database connection established.');
  } catch (error: any) {
    console.error(`❌ Connection Failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;