import { prisma } from "@/lib/prisma";

export const TravelReportService = {
  async getRevenueReport(startDate: Date, endDate: Date) {
    const bookings = await prisma.travelBooking.findMany({
      where: {
        status: 'PAID',
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        payment: true,
        schedule: {
          include: {
            route: true,
            vehicle: true,
            driver: true
          }
        }
      }
    });

    // Aggregate by Route
    const byRoute: Record<string, number> = {};
    const byDriver: Record<string, number> = {};
    let totalRevenue = 0;

    bookings.forEach(b => {
      const amount = b.payment?.amount || 0;
      const routeName = `${b.schedule.route.origin} - ${b.schedule.route.destination}`;
      const driverName = b.schedule.driver.name;

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
