#!/usr/bin/env bun
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const email = 'admin@hydro-flow.io';
    const password = 'Admin123!';
    const name = 'Admin User';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log(`❌ User ${email} already exists`);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await argon2.hash(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'ADMIN',
      },
    });

    console.log('✅ Test user created successfully!');
    console.log('\nCredentials:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`\nUser ID: ${user.id}`);
    console.log(`Role: ${user.role}`);
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
