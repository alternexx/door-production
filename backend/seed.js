const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid'); // Add uuid for IDs

const prisma = new PrismaClient();

async function main() {
  // Seed users
  const hashedPassword = await bcrypt.hash('password123', 12);
  const usersData = [
    {
      id: uuidv4(),
      email: 'tenant@example.com',
      name: 'John Tenant',
      password: hashedPassword,
      role: 'TENANT'
    },
    {
      id: uuidv4(),
      email: 'owner@example.com',
      name: 'Jane Owner',
      password: hashedPassword,
      role: 'OWNER'
    },
    {
      id: uuidv4(),
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN'
    }
  ];

  const users = await prisma.$transaction(
    usersData.map(user => prisma.user.create({ data: user }))
  );

  // Get tenant and owner IDs
  const tenantUser = users.find(u => u.email === 'tenant@example.com');
  const ownerUser = users.find(u => u.email === 'owner@example.com');

  // Seed qual profile for tenant
  await prisma.qualProfile.create({
    data: {
      id: uuidv4(),
      userId: tenantUser.id,
      annualIncome: 60000,
      creditScore: 720,
      qualScore: 85,
      qualTier: 'PLATINUM'
    }
  });

  // Seed listings
  const listingsData = [
    {
      id: uuidv4(),
      ownerId: ownerUser.id,
      title: '2 Bed in Brooklyn',
      address: '123 Main St, Brooklyn, NY',
      rent: 2800,
      beds: 2,
      baths: 1,
      sqft: 850,
      active: true
    },
    {
      id: uuidv4(),
      ownerId: ownerUser.id,
      title: 'Studio in Manhattan',
      address: '456 Park Ave, Manhattan, NY',
      rent: 2200,
      beds: 0,
      baths: 1,
      sqft: 450,
      active: true
    },
    {
      id: uuidv4(),
      ownerId: ownerUser.id,
      title: '1 Bed in Queens',
      address: '789 Queens Blvd, Queens, NY',
      rent: 1900,
      beds: 1,
      baths: 1,
      sqft: 600,
      active: true
    }
  ];

  await prisma.$transaction(
    listingsData.map(listing => prisma.listing.create({ data: listing }))
  );

  console.log('Seeding complete: 3 users, 1 qual profile, 3 listings');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
