import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from '../models/Service.js';

dotenv.config();

// ─── These category values MUST match what frontend mockData.ts sends ─────────
// Frontend serviceCategories use these category strings:
//   "Water & Sanitation", "Infrastructure", "Health", "Education",
//   "Environment", "Security"
//
// The Service model enum is updated to match. See models/Service.js fix.

const services = [
  {
    name: 'Water Supply & Sanitation Services',
    category: 'Water & Sanitation',
    description: 'Water supply, billing, new connections, pipe repairs, and sanitation services for Kakamega County residents.',
    requirements: [
      'National ID or passport',
      'Proof of residence (utility bill or land title)',
      'Completed application form',
      'Location sketch/map',
    ],
    processingTime: '7-14 business days',
    fee: 3000,
    department: 'Water & Sanitation',
    isAvailable: true,
  },
  {
    name: 'Roads & Infrastructure Services',
    category: 'Infrastructure',
    description: 'Pothole repairs, road maintenance, street lighting installation, and signage requests.',
    requirements: [
      'National ID',
      'Location description or GPS coordinates',
      'Photographs of the issue (optional)',
    ],
    processingTime: '14-30 business days',
    fee: 0,
    department: 'Public Works',
    isAvailable: true,
  },
  {
    name: 'Health Services',
    category: 'Health',
    description: 'Public health services, hospital referrals, vaccination programs, and medical facility support.',
    requirements: [
      'National ID or birth certificate',
      'Health facility referral letter (if applicable)',
    ],
    processingTime: '3-7 business days',
    fee: 0,
    department: 'Health Services',
    isAvailable: true,
  },
  {
    name: 'Education Support Services',
    category: 'Education',
    description: 'School bursaries, ECD program enrollment, school infrastructure support, and learning materials.',
    requirements: [
      'National ID of parent/guardian',
      "Student's birth certificate",
      'School admission letter',
      'Proof of residence',
    ],
    processingTime: '7-21 business days',
    fee: 0,
    department: 'Education',
    isAvailable: true,
  },
  {
    name: 'Waste Management & Collection',
    category: 'Environment',
    description: 'Garbage collection scheduling, disposal site requests, and environmental conservation programs.',
    requirements: [
      'National ID',
      'Proof of residence or business permit',
      'Location description',
    ],
    processingTime: '3-7 business days',
    fee: 500,
    department: 'Environment',
    isAvailable: true,
  },
  {
    name: 'County Security & Enforcement',
    category: 'Security',
    description: 'County enforcement patrols, security incident reporting, and public order services.',
    requirements: [
      'National ID',
      'Incident description',
      'Location and time of incident',
    ],
    processingTime: '1-3 business days',
    fee: 0,
    department: 'General Administration',
    isAvailable: true,
  },
];

const seedServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Wipe existing services to avoid duplicates on re-seed
    const deleted = await Service.deleteMany({});
    console.log(`🗑️  Cleared ${deleted.deletedCount} existing services\n`);

    const inserted = await Service.insertMany(services);
    console.log(`✅ ${inserted.length} services seeded successfully:\n`);

    inserted.forEach((s) => {
      console.log(`   • [${s.category}] ${s.name}  (${s.fee > 0 ? `KES ${s.fee}` : 'Free'})`);
    });

    console.log('\n─────────────────────────────────────────────────────');
    console.log('ℹ️  These category values match frontend mockData.ts');
    console.log('   Service requests will now resolve correctly.');
    console.log('─────────────────────────────────────────────────────\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    if (error.errors) {
      // Print mongoose validation errors clearly
      Object.entries(error.errors).forEach(([field, err]) => {
        console.error(`   Field "${field}": ${err.message}`);
      });
    }
    process.exit(1);
  }
};

seedServices();