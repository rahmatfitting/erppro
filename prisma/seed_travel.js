const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding travel data...');

  // 1. Routes
  const route1 = await prisma.travelRoute.create({
    data: { origin: 'Surabaya', destination: 'Malang' }
  });
  const route2 = await prisma.travelRoute.create({
    data: { origin: 'Malang', destination: 'Surabaya' }
  });

  // 2. Vehicles
  const v1 = await prisma.travelVehicle.create({
    data: {
      name: 'Avanza Luxury',
      plateNumber: 'L 1234 AB',
      capacity: 7,
      status: 'ACTIVE',
      currentKm: 15000,
      layout: {
        rows: 3,
        cols: 3,
        seats: [
          { num: 1, row: 1, col: 1 }, { num: 2, row: 1, col: 3 },
          { num: 3, row: 2, col: 1 }, { num: 4, row: 2, col: 2 }, { num: 5, row: 2, col: 3 },
          { num: 6, row: 3, col: 1 }, { num: 7, row: 3, col: 3 }
        ]
      }
    }
  });

  const v2 = await prisma.travelVehicle.create({
    data: {
      name: 'Hiace Commuter',
      plateNumber: 'W 5678 CD',
      capacity: 14,
      status: 'ACTIVE',
      currentKm: 45000
    }
  });

  // 3. Drivers
  const d1 = await prisma.travelDriver.create({
    data: { name: 'Ahmad Subarjo', phone: '08123456789' }
  });
  const d2 = await prisma.travelDriver.create({
    data: { name: 'Budi Santoso', phone: '08223344556' }
  });

  // 4. Schedules (Today)
  const today = new Date();
  today.setHours(8, 0, 0, 0);

  await prisma.travelSchedule.create({
    data: {
      routeId: route1.nomor,
      vehicleId: v1.nomor,
      driverId: d1.nomor,
      departure: today,
      price: 150000
    }
  });

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
