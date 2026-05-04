import { prisma } from "@/lib/prisma";

export const MaintenanceService = {
  async getFleetStatus() {
    const vehicles = await prisma.travelVehicle.findMany({
      include: {
        services: {
          include: { serviceType: true }
        }
      }
    });

    return vehicles.map(v => {
      let maintenanceStatus = 'NORMAL';
      const issues: string[] = [];

      v.services.forEach(s => {
        if (s.nextServiceKm) {
          const remaining = s.nextServiceKm - v.currentKm;
          if (remaining <= 0) {
            maintenanceStatus = 'OVERDUE';
            issues.push(`${s.serviceType.name} is overdue by ${Math.abs(remaining)}km`);
          } else if (remaining <= 500) {
            if (maintenanceStatus !== 'OVERDUE') maintenanceStatus = 'WARNING';
            issues.push(`${s.serviceType.name} is due in ${remaining}km`);
          }
        }
      });

      return {
        ...v,
        maintenanceStatus,
        issues
      };
    });
  }
};
