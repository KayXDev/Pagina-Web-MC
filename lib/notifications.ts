import dbConnect from '@/lib/mongodb';
import Notification, { type NotificationType } from '@/models/Notification';
import User from '@/models/User';

type BroadcastPayload = {
  title: string;
  message: string;
  href?: string;
  type?: NotificationType;
};

export async function broadcastNotification(payload: BroadcastPayload) {
  await dbConnect();

  const cursor = User.find({}, { _id: 1 }).lean().cursor();
  const BATCH_SIZE = 1000;

  let created = 0;
  let batch: any[] = [];

  const flush = async () => {
    if (batch.length === 0) return;
    const ops = batch.map((u: any) => ({
      insertOne: {
        document: {
          userId: String(u._id),
          title: payload.title,
          message: payload.message,
          href: payload.href,
          type: payload.type ?? 'INFO',
        },
      },
    }));

    const result: any = await Notification.bulkWrite(ops, { ordered: false });
    created +=
      typeof result?.insertedCount === 'number'
        ? result.insertedCount
        : typeof result?.nInserted === 'number'
          ? result.nInserted
          : batch.length;
    batch = [];
  };

  for await (const u of cursor) {
    batch.push(u);
    if (batch.length >= BATCH_SIZE) await flush();
  }
  await flush();

  return { created };
}
