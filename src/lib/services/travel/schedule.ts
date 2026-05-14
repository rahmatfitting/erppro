import { prisma } from "@/lib/prisma";

export const ScheduleService = {
  async getAllRoutes() {
    return await prisma.travelroute.findMany({
      orderBy: [
        { origin: 'asc' },
        { destination: 'asc' }
      ]
    });
  },

  async createRoute(origin: string, destination: string) {
    return await prisma.travelroute.create({
      data: { origin, destination }
    });
  },

  async updateRoute(nomor: number, data: { origin: string, destination: string }) {
    return await prisma.travelroute.update({
      where: { nomor },
      data
    });
  },

  async deleteRoute(nomor: number) {
    return await prisma.travelroute.delete({
      where: { nomor }
    });
  },

  async getSchedules(filters: {
    origin?: string;
    destination?: string;
    date?: string;
  }) {
    const where: any = {};
    
    if (filters.origin || filters.destination) {
      where.travelroute = {
        origin: filters.origin,
        destination: filters.destination,
      };
    }

    if (filters.date) {
      const start = new Date(filters.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filters.date);
      end.setHours(23, 59, 59, 999);
      where.departure = {
        gte: start,
        lte: end
      };
    }

    const schedules = await prisma.travelschedule.findMany({
      where,
      include: {
        travelroute: true,
        travelvehicle: true,
        traveldriver: true,
        _count: {
          select: {
            travelbooking: {
              where: {
                status: {
                  in: ['PAID', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED']
                }
              }
            }
          }
        }
      },
      orderBy: { departure: 'asc' }
    });

    return schedules.map((s: any) => ({
      ...s,
      route: s.travelroute,
      vehicle: s.travelvehicle,
      driver: s.traveldriver,
      _count: {
        bookings: s._count?.travelbooking || 0
      }
    }));
  },

  async createSchedule(data: {
    routeId: number;
    vehicleId: number;
    driverId: number;
    departure: Date;
    price: number;
  }) {
    return await prisma.travelschedule.create({
      data
    });
  },

  async deleteSchedule(nomor: number) {
    return await prisma.travelschedule.delete({
      where: { nomor }
    });
  }
};
