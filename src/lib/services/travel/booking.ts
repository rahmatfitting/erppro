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
      const existingDetails = await tx.travelBookingDetail.findMany({
        where: {
          scheduleId,
          seatNumber: { in: seats }
        },
        include: {
          booking: true
        }
      });

      for (const detail of existingDetails) {
        const isHoldActive = detail.booking.status === "HOLD" && detail.booking.expiredAt && detail.booking.expiredAt > new Date();
        const isConfirmed = ["PAID", "CONFIRMED", "CHECKED_IN", "COMPLETED"].includes(detail.booking.status);

        if (isHoldActive || isConfirmed) {
          throw new Error(`Seat #${detail.seatNumber} is already taken or being held.`);
        }

        // If we reach here, it means the existing detail belongs to an EXPIRED or CANCELLED booking.
        // We MUST delete it to satisfy the unique constraint [scheduleId, seatNumber]
        await tx.travelBookingDetail.delete({
          where: { nomor: detail.nomor }
        });
      }

      // 3. Generate Booking Code
      const code = `TRV-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;

      // 4. Create Booking
      const booking = await tx.travelBooking.create({
        data: {
          code,
          customerId: customer.nomor,
          scheduleId,
          userId,
          status: 'HOLD',
          expiredAt: addMinutes(new Date(), 15),
          details: {
            create: seats.map(seat => ({
              seatNumber: seat,
              scheduleId
            }))
          }
        },
        include: {
          details: true
        }
      });

      // 5. Create initial Payment record
      const schedule = await tx.travelSchedule.findUnique({ where: { nomor: scheduleId } });
      const totalAmount = (schedule?.price || 0) * seats.length;

      await tx.travelPayment.create({
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
      const booking = await tx.travelBooking.update({
        where: { nomor: bookingId },
        data: {
          status: 'PAID'
        }
      });

      await tx.travelPayment.update({
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
    const expired = await prisma.travelBooking.findMany({
      where: {
        status: 'HOLD',
        expiredAt: { lt: new Date() }
      },
      select: { nomor: true }
    });

    if (expired.length === 0) return 0;

    const ids = expired.map(b => b.nomor);

    // Delete details first due to foreign key
    await prisma.travelBookingDetail.deleteMany({
      where: { bookingId: { in: ids } }
    });

    // Update status to EXPIRED (or delete if you want to keep DB clean)
    const result = await prisma.travelBooking.updateMany({
      where: { nomor: { in: ids } },
      data: { status: 'EXPIRED' }
    });

    return result.count;
  },

  async getManifest(scheduleId: number) {
    const details = await prisma.travelBookingDetail.findMany({
      where: {
        scheduleId,
        booking: {
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
        booking: {
          include: {
            customer: true
          }
        }
      },
      orderBy: { seatNumber: 'asc' }
    });

    return details.map(d => ({
      nomor: d.nomor,
      seatNumber: d.seatNumber,
      customerName: d.booking.customer.nama,
      customerPhone: d.booking.customer.telepon,
      status: d.booking.status,
      bookingCode: d.booking.code
    }));
  },

  async getPayments() {
    return await prisma.travelPayment.findMany({
      include: {
        booking: {
          include: {
            customer: true,
            schedule: {
              include: {
                route: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async getBookings() {
    return await prisma.travelBooking.findMany({
      include: {
        customer: true,
        schedule: {
          include: {
            route: true
          }
        },
        payment: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
};
