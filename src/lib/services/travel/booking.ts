import { prisma } from "@/lib/prisma";
import { addMinutes } from "date-fns";

export const BookingService = {
  async findOrCreateCustomer(name: string, phone: string) {
    let customer = await prisma.mhcustomer.findFirst({
      where: { telepon: phone }
    });

    if (!customer) {
      // Get last customer code or generate new one
      const last = await prisma.mhcustomer.findFirst({ orderBy: { nomor: 'desc' } });
      const nextId = (last?.nomor || 0) + 1;
      const kode = `CUST-TRV-${nextId.toString().padStart(4, '0')}`;

      customer = await prisma.mhcustomer.create({
        data: {
          kode,
          nama: name,
          telepon: phone,
          status_aktif: true
        }
      });
    }

    return customer;
  },

  /**
   * Lock seats for a specific schedule.
   * Uses a transaction to ensure no double booking.
   */
  async lockSeats(data: {
    scheduleId: number;
    seats: number[];
    customerName: string;
    customerPhone: string;
    userId?: number;
  }) {
    const { scheduleId, seats, customerName, customerPhone, userId } = data;

    // 1. Find or create customer
    const customer = await this.findOrCreateCustomer(customerName, customerPhone);

    return await prisma.$transaction(async (tx) => {
      // 2. Check for ANY existing records for these seats in this schedule
      const existingDetails = await tx.travelbookingdetail.findMany({
        where: {
          scheduleId,
          seatNumber: { in: seats }
        },
        include: {
          travelbooking: true
        }
      });

      for (const detail of existingDetails as any[]) {
        const isHoldActive = detail.travelbooking.status === "HOLD" && detail.travelbooking.expiredAt && detail.travelbooking.expiredAt > new Date();
        const isConfirmed = ["PAID", "CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(detail.travelbooking.status);

        if (isHoldActive || isConfirmed) {
          throw new Error(`Seat #${detail.seatNumber} is already taken or being held.`);
        }

        // If we reach here, it means the existing detail belongs to an EXPIRED or CANCELLED booking.
        // We MUST delete it to satisfy the unique constraint [scheduleId, seatNumber]
        await tx.travelbookingdetail.delete({
          where: { nomor: detail.nomor }
        });
      }

      // 3. Generate Booking Code
      const code = `TRV-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;

      // 4. Create Booking
      const booking = await tx.travelbooking.create({
        data: {
          code,
          customerId: customer.nomor,
          scheduleId,
          userId,
          status: 'HOLD',
          expiredAt: addMinutes(new Date(), 15),
          travelbookingdetail: {
            create: seats.map(seat => ({
              seatNumber: seat,
              scheduleId
            }))
          }
        },
        include: {
          travelbookingdetail: true
        }
      });

      // 5. Create initial Payment record
      const schedule = await tx.travelschedule.findUnique({ where: { nomor: scheduleId } });
      const totalAmount = (schedule?.price || 0) * seats.length;

      await tx.travelpayment.create({
        data: {
          bookingId: booking.nomor,
          amount: totalAmount,
          method: 'TRANSFER',
          status: 'PENDING'
        }
      });

      return booking;
    });
  },

  async confirmPayment(bookingId: number, proofImage?: string) {
    return await prisma.$transaction(async (tx) => {
      const booking = await tx.travelbooking.update({
        where: { nomor: bookingId },
        data: {
          status: 'PAID'
        }
      });

      await tx.travelpayment.update({
        where: { bookingId },
        data: {
          status: 'SUCCESS',
          paidAt: new Date(),
          proofImage
        }
      });

      return booking;
    });
  },

  /**
   * Cleanup expired HOLD bookings
   * Should be called by a cron job or background process
   */
  async releaseExpiredBookings() {
    const expired = await prisma.travelbooking.findMany({
      where: {
        status: 'HOLD',
        expiredAt: { lt: new Date() }
      },
      select: { nomor: true }
    });

    if (expired.length === 0) return 0;

    const ids = expired.map(b => b.nomor);

    // Delete details first due to foreign key
    await prisma.travelbookingdetail.deleteMany({
      where: { bookingId: { in: ids } }
    });

    // Update status to EXPIRED (or delete if you want to keep DB clean)
    const result = await prisma.travelbooking.updateMany({
      where: { nomor: { in: ids } },
      data: { status: 'EXPIRED' }
    });

    return result.count;
  },

  async getManifest(scheduleId: number) {
    const details = await prisma.travelbookingdetail.findMany({
      where: {
        scheduleId,
        travelbooking: {
          status: {
            in: ["HOLD", "PAID", "CONFIRMED", "CHECKED_IN", "COMPLETED"]
          },
          // Filter out expired HOLD bookings
          OR: [
            { status: { not: "HOLD" } },
            { expiredAt: { gt: new Date() } }
          ]
        }
      },
      include: {
        travelbooking: {
          include: {
            mhcustomer: true
          }
        }
      },
      orderBy: { seatNumber: 'asc' }
    });

    return details.map((d: any) => ({
      nomor: d.nomor,
      seatNumber: d.seatNumber,
      customerName: d.travelbooking.mhcustomer.nama,
      customerPhone: d.travelbooking.mhcustomer.telepon,
      status: d.travelbooking.status,
      bookingCode: d.travelbooking.code
    }));
  },

  async getPayments() {
    const payments = await prisma.travelpayment.findMany({
      include: {
        travelbooking: {
          include: {
            mhcustomer: true,
            travelschedule: {
              include: {
                travelroute: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return payments.map((p: any) => ({
      ...p,
      booking: p.travelbooking ? {
        ...p.travelbooking,
        customer: p.travelbooking.mhcustomer,
        schedule: p.travelbooking.travelschedule ? {
          ...p.travelbooking.travelschedule,
          route: p.travelbooking.travelschedule.travelroute
        } : null
      } : null
    }));
  },

  async getBookings() {
    const bookings = await prisma.travelbooking.findMany({
      include: {
        mhcustomer: true,
        travelschedule: {
          include: {
            travelroute: true
          }
        },
        travelpayment: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return bookings.map((b: any) => ({
      ...b,
      customer: b.mhcustomer,
      schedule: b.travelschedule ? {
        ...b.travelschedule,
        route: b.travelschedule.travelroute
      } : null,
      payment: b.travelpayment
    }));
  }
};
