import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Service from '../models/Service.js';

dotenv.config();

const services = [
  {
    name: 'Birth Certificate Application',
    category: 'Birth Certificate',
    description: 'Apply for a birth certificate for children born in Kakamega County',
    requirements: [
      'Birth notification from hospital',
      'Parents\' ID cards',
      'Marriage certificate (if applicable)',
      'Completed application form'
    ],
    processingTime: '5-7 business days',
    fee: 500,
    department: 'Health Services',
    isAvailable: true,
  },
  {
    name: 'Death Certificate Application',
    category: 'Death Certificate',
    description: 'Apply for a death certificate for residents of Kakamega County',
    requirements: [
      'Medical certificate of cause of death',
      'ID of the deceased',
      'Applicant ID',
      'Letter from chief/assistant chief'
    ],
    processingTime: '3-5 business days',
    fee: 500,
    department: 'Health Services',
    isAvailable: true,
  },
  {
    name: 'Business Permit Application',
    category: 'Business Permit',
    description: 'Apply for a single business permit to operate within Kakamega County',
    requirements: [
      'Completed application form',
      'Business registration certificate',
      'PIN certificate',
      'ID of business owner',
      'Location plan/lease agreement'
    ],
    processingTime: '7-10 business days',
    fee: 2500,
    department: 'Finance',
    isAvailable: true,
  },
  {
    name: 'Building Permit Application',
    category: 'Building Permit',
    description: 'Apply for a permit to construct buildings within Kakamega County',
    requirements: [
      'Building plans',
      'Title deed',
      'Structural engineer report',
      'Environmental impact assessment',
      'Survey map'
    ],
    processingTime: '14-21 business days',
    fee: 5000,
    department: 'Public Works',
    isAvailable: true,
  },
  {
    name: 'Water Connection Application',
    category: 'Water Connection',
    description: 'Apply for water connection in Kakamega County',
    requirements: [
      'Title deed/land ownership proof',
      'ID of applicant',
      'Location map',
      'Completed application form'
    ],
    processingTime: '7-14 business days',
    fee: 3000,
    department: 'Water & Sanitation',
    isAvailable: true,
  },
  {
    name: 'Land Rates Payment & Clearance',
    category: 'Land Rates',
    description: 'Pay land rates and obtain clearance certificate',
    requirements: [
      'Title deed',
      'Current land rates statement',
      'Previous payment receipts',
      'ID of property owner'
    ],
    processingTime: '2-3 business days',
    fee: 0,
    department: 'Lands & Housing',
    isAvailable: true,
  },
  {
    name: 'Marriage Certificate Application',
    category: 'Marriage Certificate',
    description: 'Apply for marriage certificate in Kakamega County',
    requirements: [
      'Marriage license',
      'IDs of both spouses',
      'Passport photos',
      'Witness statements'
    ],
    processingTime: '7-10 business days',
    fee: 1000,
    department: 'Social Services',
    isAvailable: true,
  },
];

const seedServices = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing services
    await Service.deleteMany({});
    console.log('Cleared existing services');

    // Insert new services
    await Service.insertMany(services);
    console.log(`✅ ${services.length} services seeded successfully`);

    process.exit();
  } catch (error) {
    console.error('❌ Error seeding services:', error.message);
    process.exit(1);
  }
};

seedServices();