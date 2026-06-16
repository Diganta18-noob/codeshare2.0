/**
 * Admin Seed Script
 * 
 * Creates the initial admin user if one doesn't exist.
 * 
 * Usage:
 *   npx ts-node --skip-project scripts/seed-admin.ts
 * 
 * Or set ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD env vars and run.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/codeshare';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@codeshare.dev';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function seed() {
  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { dbName: 'codeshare' });

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Failed to get database instance');
  }
  const usersCollection = db.collection('users');

  // Check if admin exists
  const existing = await usersCollection.findOne({ role: 'admin' });
  if (existing) {
    console.log(`✅ Admin user already exists: ${existing.email} (${existing.username})`);
    await mongoose.disconnect();
    return;
  }

  // Create admin
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await usersCollection.insertOne({
    email: ADMIN_EMAIL,
    username: ADMIN_USERNAME,
    passwordHash,
    role: 'admin',
    status: 'active',
    avatar: null,
    bio: 'System Administrator',
    lastLogin: null,
    loginCount: 0,
    roomsCreated: 0,
    totalEdits: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`✅ Admin user created!`);
  console.log(`   Email:    ${ADMIN_EMAIL}`);
  console.log(`   Username: ${ADMIN_USERNAME}`);
  console.log(`   Password: ${ADMIN_PASSWORD}`);
  console.log('\n⚠️  Change the default password in production!');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
