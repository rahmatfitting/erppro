import { prisma } from "@/lib/prisma";

// SSE endpoint for seat updates on a specific schedule
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scheduleId = parseInt(searchParams.get("scheduleId") || "0");

  if (!scheduleId) return new Response("Schedule ID required", { status: 400 });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      // Poll for changes every 2 seconds (simple version of "real-time")
      const interval = setInterval(async () => {
        try {
          const bookings = await prisma.travelBookingDetail.findMany({
            where: {
              scheduleId,
              booking: {
                status: {
                  in: ["HOLD", "PAID", "CONFIRMED"]
                },
                OR: [
                  { status: { not: "HOLD" } },
                  { expiredAt: { gt: new Date() } }
                ]
              }
            },
            select: { seatNumber: true }
          });

          send({
            type: 'seat_update',
            occupiedSeats: bookings.map(b => b.seatNumber)
          });
        } catch (err) {
          // heartbeat
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }
      }, 2000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
