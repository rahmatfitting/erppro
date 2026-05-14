import { prisma } from "@/lib/prisma";

export const FleetService = {
  // --- Vehicles ---
  async getAllVehicles() {
    const vehicles = await prisma.travelvehicle.findMany({
      include: {
        _count: {
          select: { travelschedule: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return vehicles.map((v: any) => ({
      ...v,
      _count: {
        schedules: v._count?.travelschedule || 0
      }
    }));
  },

  async getVehicleById(nomor: number) {
    const v = await prisma.travelvehicle.findUnique({
      where: { nomor },
      include: {
        travelschedule: {
          take: 5,
          orderBy: { departure: 'desc' },
          include: { travelroute: true }
        },
        travelvehicleservice: true,
        travelservicelog: {
          take: 10,
          orderBy: { date: 'desc' }
        }
      }
    });

    if (!v) return null;

    return {
      ...v,
      schedules: v.travelschedule?.map((s: any) => ({
        ...s,
        route: s.travelroute
      })) || [],
      services: v.travelvehicleservice || [],
      serviceLogs: v.travelservicelog || []
    };
  },

  async createVehicle(data: {
    name: string;
    plateNumber: string;
    capacity: number;
    layout?: any;
  }) {
    return await prisma.travelvehicle.create({
      data: {
        ...data,
        status: 'ACTIVE'
      }
    });
  },

  async updateVehicle(nomor: number, data: any) {
    return await prisma.travelvehicle.update({
      where: { nomor },
      data
    });
  },

  async deleteVehicle(nomor: number) {
    return await prisma.travelvehicle.delete({
      where: { nomor }
    });
  },

  // --- Drivers ---
  async getAllDrivers() {
    return await prisma.traveldriver.findMany({
      orderBy: { name: 'asc' }
    });
  },

  async createDriver(data: { name: string; phone: string }) {
    return await prisma.traveldriver.create({
      data
    });
  },

  async updateDriver(nomor: number, data: any) {
    return await prisma.traveldriver.update({
      where: { nomor },
      data
    });
  },

  async deleteDriver(nomor: number) {
    return await prisma.traveldriver.delete({
      where: { nomor }
    });
  }
};
