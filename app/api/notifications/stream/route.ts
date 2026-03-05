import dbConnect from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveUserIdFromSessionUser(user: any) {
  const direct = typeof user?.id === 'string' && user.id ? user.id : undefined;
  if (direct) return direct;

  const alt = typeof user?._id === 'string' && user._id ? user._id : undefined;
  if (alt) return alt;

  const email = typeof user?.email === 'string' ? user.email.toLowerCase() : '';
  if (!email) throw new Error('Unauthorized');

  await dbConnect();
  const found = await User.findOne({ email }, { _id: 1 }).lean();
  const id = found?._id ? String((found as any)._id) : '';
  if (!id) throw new Error('Unauthorized');
  return id;
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const userId = await resolveUserIdFromSessionUser(user);

    const encoder = new TextEncoder();
    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let lastSignature = '';

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const emit = (eventName: string, payload: Record<string, unknown>) => {
          if (stopped) return;
          const frame = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(frame));
        };

        const tick = async () => {
          if (stopped) return;
          try {
            const [unreadCount, latest] = await Promise.all([
              Notification.countDocuments({ userId, readAt: { $exists: false } }),
              Notification.findOne({ userId, readAt: { $exists: false } }, { _id: 1, createdAt: 1 })
                .sort({ createdAt: -1 })
                .lean(),
            ]);

            const latestId = latest?._id ? String((latest as any)._id) : '';
            const signature = `${unreadCount}:${latestId}`;
            if (signature !== lastSignature) {
              lastSignature = signature;
              emit('notifications', { unreadCount });
            }
          } catch {
            emit('heartbeat', { ok: true });
          }
        };

        emit('ready', { ok: true });
        void tick();

        timer = setInterval(() => {
          void tick();
          controller.enqueue(encoder.encode(': ping\n\n'));
        }, 2000);

        request.signal.addEventListener('abort', () => {
          stopped = true;
          if (timer) clearInterval(timer);
          try {
            controller.close();
          } catch {
            // ignore
          }
        });
      },
      cancel() {
        stopped = true;
        if (timer) clearInterval(timer);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch {
    return new Response('Unauthorized', { status: 401 });
  }
}
