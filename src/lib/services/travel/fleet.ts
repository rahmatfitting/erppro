import { prisma } from "@/lib/prisma";

export const FleetService = {
  // --- Vehicles ---
  async getAllVehicles() {
    return await prisma.travelVehicle.findMany({
      include: {
        _count: {
          select: { schedules: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  },

  async getVehicleById(nomor: number) {
    return await prisma.travelVehicle.findUnique({
      where: { nomor },
      include: {
        schedules: {
          take: 5,
          orderBy: { departure: 'desc' },
          include: { route: true }
        },
        services: true,
        serviceLogs: {
          take: 10,
          orderBy: { date: 'desc' }
        }
      }
    });
  },

  async createVehicle(data: {
    name: string;
    plateNumber: string;
    capacity: number;
    layout?: any;
  }) {
    return await prisma.travelVehicle.create({
      data: {
        ...data,
        status: 'ACTIVE'
      }
    });
  },

  async updateVehicle(nomor: number, data: any) {
    return await prisma.travelVehicle.update({
      where: { nomor },
      data
    });
  },

  async deleteVehicle(nomor: number) {
    return await prisma.travelVehicle.delete({
      where: { nomor }
    });
  },

  // --- Drivers ---
  async getAllDrivers() {
    return await prisma.travelDriver.findMany({
      orderBy: { name: 'asc' }
    });
  },

  async createDriver(data: { name: string; phone: string }) {
    return await prisma.travelDriver.create({
      data
    });
  },

  async updateDriver(nomor: number, data: any) {
    return await prisma.travelDriver.update({
      where: { nomor },
      data
    });
  },

  async deleteDriver(nomor: number) {
    return await prisma.travelDriver.delete({
      where: { nomor }
    });
  }
};
