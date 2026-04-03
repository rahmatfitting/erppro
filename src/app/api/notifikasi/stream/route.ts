import { executeQuery } from '@/lib/db';
import { getSession } from '@/lib/auth';

// SSE endpoint — keeps connection alive and streams new notifications
export async function GET(request: Request) {
  const session = await getSession();
  const userId = session?.id || 0;

  // Initial snapshot of last seen notification ID
  const lastRows: any = await executeQuery(
    `SELECT COALESCE(MAX(nomor), 0) as lastId FROM mhnotifikasi WHERE nomor_user = ?`,
    [userId]
  );
  let lastId: number = lastRows[0]?.lastId ?? 0;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* client disconnected */ }
      };

      // Send current unread count immediately on connect
      try {
        const unreadRows: any = await executeQuery(
          `SELECT COUNT(*) as cnt FROM mhnotifikasi WHERE nomor_user = ? AND dibaca = 0`,
          [userId]
        );
        send({ type: 'init', unreadCount: unreadRows[0]?.cnt ?? 0 });
      } catch { /* silent */ }

      // Poll DB every 5 seconds for new notifications
      const interval = setInterval(async () => {
        try {
          const newRows: any = await executeQuery(
            `SELECT * FROM mhnotifikasi WHERE nomor_user = ? AND nomor > ? ORDER BY nomor ASC LIMIT 10`,
            [userId, lastId]
          );

          if ((newRows as any[]).length > 0) {
            lastId = (newRows as any[]).at(-1).nomor;
            const unreadRows: any = await executeQuery(
              `SELECT COUNT(*) as cnt FROM mhnotifikasi WHERE nomor_user = ? AND dibaca = 0`,
              [userId]
            );
            send({
              type: 'new',
              notifications: newRows,
              unreadCount: unreadRows[0]?.cnt ?? 0,
            });
          }
        } catch {
          // DB error — send heartbeat to keep connection alive
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        }
      }, 5000);

      // Heartbeat every 25s to prevent proxies from closing the connection
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch { clearInterval(heartbeat); clearInterval(interval); }
      }, 25000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // needed for nginx proxies
    },
  });
}
