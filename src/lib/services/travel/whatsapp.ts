import { executeQuery } from "@/lib/db";

export const TravelWAService = {
  async sendBookingConfirmation(booking: any) {
    try {
      const settings: any = await executeQuery(`SELECT * FROM mhsetting_notifikasi_wa LIMIT 1`);
      if (!settings || settings.length === 0 || !settings[0].gateway_token) return;

      const { gateway_url, gateway_token } = settings[0];
      const customerPhone = booking.customer.phone;
      
      const message = `🎫 *KONFIRMASI BOOKING TRAVEL*

Halo *${booking.customer.name}*, terima kasih telah memesan layanan travel kami.

*Detail Perjalanan:*
Kode Booking: ${booking.code}
Rute: ${booking.schedule.route.origin} → ${booking.schedule.route.destination}
Jadwal: ${new Date(booking.schedule.departure).toLocaleString('id-ID')}
Kursi: ${booking.details.map((d: any) => d.seatNumber).join(', ')}

*Status:* ${booking.status}
*Total Bayar:* Rp ${booking.payment.amount.toLocaleString('id-ID')}

Silakan lakukan pembayaran ke rekening kami dan upload bukti transfer melalui link berikut:
http://localhost:3000/travel/booking/payment/${booking.code}

Terima kasih!`;

      await fetch(gateway_url, {
        method: 'POST',
        headers: { 'Authorization': `${gateway_token}` },
        body: new URLSearchParams({ 'target': customerPhone, 'message': message, 'countryCode': '62' })
      });

    } catch (err) {
      console.error("Failed to send WA confirmation:", err);
    }
  }
};
