import { prisma } from "@/lib/prisma";

export const TravelReportService = {
  async getRevenueReport(startDate: Date, endDate: Date) {
    const bookings = await prisma.travelbooking.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        travelpayment: true,
        travelschedule: {
          include: {
            travelroute: true,
            travelvehicle: true,
            traveldriver: true
          }
        }
      }
    });

    // Aggregate by Route
    const byRoute: Record<string, number> = {};
    const byDriver: Record<string, number> = {};
    let totalRevenue = 0;

    bookings.forEach((b: any) => {
      const amount = b.travelpayment?.amount || 0;
      const routeName = `${b.travelschedule.travelroute.origin} - ${b.travelschedule.travelroute.destination}`;
      const driverName = b.travelschedule.traveldriver.name;

      byRoute[routeName] = (byRoute[routeName] || 0) + amount;
      byDriver[driverName] = (byDriver[driverName] || 0) + amount;
      totalRevenue += amount;
    });

    return {
      totalRevenue,
      count: bookings.length,
      byRoute,
      byDriver
    };
  }
};
