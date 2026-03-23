import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── Seed super admin ────────────────────────────────────────────────────
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@kakamega.go.ke';
    const adminPass  = process.env.ADMIN_PASSWORD || 'Admin@2024!';

    const adminExists = await User.findOne({ email: adminEmail });

    if (adminExists) {
      console.log(`⚠️  Admin already exists: ${adminEmail}`);
    } else {
      await User.create({
        name:       'System Administrator',
        email:      adminEmail,
        phone:      '0700000000',
        idNumber:   'ADMIN001',
        password:   adminPass,
        role:       'admin',
        department: 'General Administration',
        isActive:   true,
        mustChangePassword: false,
      });
      console.log('✅ Super admin created');
      console.log(`   Email:    ${adminEmail}`);
      console.log(`   Password: ${adminPass}`);
    }

    // ── Seed a sample officer (optional, for testing) ───────────────────────
    const officerEmail = 'officer@kakamega.go.ke';
    const officerExists = await User.findOne({ email: officerEmail });

    if (!officerExists) {
      await User.create({
        name:       'Sample Officer',
        email:      officerEmail,
        phone:      '0711000000',
        idNumber:   'OFF001',
        password:   'Officer@2024!',
        role:       'officer',
        department: 'Public Works',
        isActive:   true,
        mustChangePassword: true,
      });
      console.log('\n✅ Sample officer created');
      console.log(`   Email:    ${officerEmail}`);
      console.log(`   Password: Officer@2024!`);
      console.log('   (will be prompted to change password on first login)');
    }

    console.log('\n─────────────────────────────────────────────');
    console.log('ℹ️  No public registration endpoint exists.');
    console.log('   New staff accounts must be created by an admin');
    console.log('   via POST /api/v1/auth/staff (admin token required).');
    console.log('─────────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();