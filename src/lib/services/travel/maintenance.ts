import { prisma } from "@/lib/prisma";

export const MaintenanceService = {
  async getFleetStatus() {
    const vehicles = await prisma.travelvehicle.findMany({
      include: {
        travelvehicleservice: {
          include: { travelservicetype: true }
        }
      }
    });

    return vehicles.map((v: any) => {
      let maintenanceStatus = 'NORMAL';
      const issues: string[] = [];

      v.travelvehicleservice.forEach((s: any) => {
        if (s.nextServiceKm) {
          const remaining = s.nextServiceKm - v.currentKm;
          if (remaining <= 0) {
            maintenanceStatus = 'OVERDUE';
            issues.push(`${s.travelservicetype.name} is overdue by ${Math.abs(remaining)}km`);
          } else if (remaining <= 500) {
            if (maintenanceStatus !== 'OVERDUE') maintenanceStatus = 'WARNING';
            issues.push(`${s.travelservicetype.name} is due in ${remaining}km`);
          }
        }
      });

      return {
        ...v,
        services: v.travelvehicleservice?.map((s: any) => ({
          ...s,
          serviceType: s.travelservicetype
        })) || [],
        maintenanceStatus,
        issues
      };
    });
  }
};
