import { prisma } from '../models/prisma';
import bcrypt from 'bcryptjs';

async function seedInitialUsers() {
  try {
    const adminExists = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!adminExists) {
      console.log('🌱 Seeding initial Admin account...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          password: hashedPassword,
          role: 'ADMIN',
          fullName: 'Administrator',
          permissions: {
            create: {
              viewAllLeads: true,
              viewAssignedLeadsOnly: false,
              createLeads: true,
              editLeads: true,
              deleteLeads: true,
              changeSalesStatus: true,
              addNotes: true,
              viewRevenue: true,
              exportData: true,
              manageTeamMembers: true,
              accessAnalytics: true,
              accessSettings: true,
              createEmployeeAccounts: true
            }
          }
        }
      });
    }

    const guestExists = await prisma.user.findUnique({ where: { username: 'guest' } });
    if (!guestExists) {
      console.log('🌱 Seeding initial Guest account...');
      const guestPassword = await bcrypt.hash('guest123', 10);
      await prisma.user.create({
        data: {
          username: 'guest',
          password: guestPassword,
          role: 'GUEST',
          fullName: 'Guest User',
          permissions: {
            create: {
              viewAllLeads: false,
              viewAssignedLeadsOnly: true,
              createLeads: false,
              editLeads: false,
              deleteLeads: false,
              changeSalesStatus: false,
              addNotes: true,
              viewRevenue: false,
              exportData: false,
              manageTeamMembers: false,
              accessAnalytics: false,
              accessSettings: false,
              createEmployeeAccounts: false
            }
          }
        }
      });
    }
    console.log('✅ Default accounts ready (admin/admin123, guest/guest123)');
  } catch (err) {
    console.error('❌ Seeding failed:', err);
  }
}

const connectDB = async () => {
  try {
    console.log('🔌 Connecting to SQLite Database via Prisma...');
    await prisma.$connect();
    console.log('✅ Database connection established.');
    await seedInitialUsers();
  } catch (error: any) {
    console.error(`❌ Connection Failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;