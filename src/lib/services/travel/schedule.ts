import { prisma } from "@/lib/prisma";

export const ScheduleService = {
  async getAllRoutes() {
    return await prisma.travelRoute.findMany({
      orderBy: [
        { origin: 'asc' },
        { destination: 'asc' }
      ]
    });
  },

  async createRoute(origin: string, destination: string) {
    return await prisma.travelRoute.create({
      data: { origin, destination }
    });
  },

  async updateRoute(nomor: number, data: { origin: string, destination: string }) {
    return await prisma.travelRoute.update({
      where: { nomor },
      data
    });
  },

  async deleteRoute(nomor: number) {
    return await prisma.travelRoute.delete({
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
      where.route = {
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

    return await prisma.travelSchedule.findMany({
      where,
      include: {
        route: true,
        vehicle: true,
        driver: true,
        _count: {
          select: {
            bookings: {
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
  },

  async createSchedule(data: {
    routeId: number;
    vehicleId: number;
    driverId: number;
    departure: Date;
    price: number;
  }) {
    return await prisma.travelSchedule.create({
      data
    });
  },

  async deleteSchedule(nomor: number) {
    return await prisma.travelSchedule.delete({
      where: { nomor }
    });
  }
};
