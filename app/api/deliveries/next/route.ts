import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ShopDelivery from '@/models/ShopDelivery';
import { requireDeliveryKey } from '@/lib/deliveries';

export async function GET(request: Request) {
  try {
    if (!requireDeliveryKey(request)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    await dbConnect();

    const lockedBy = String(request.headers.get('x-delivery-client') || 'server').slice(0, 80);

    const delivery = await ShopDelivery.findOneAndUpdate(
      { status: 'PENDING' },
      {
        $set: {
          status: 'PROCESSING',
          lockedAt: new Date(),
          lockedBy,
        },
        $inc: { attempts: 1 },
      },
      { sort: { createdAt: 1 }, new: true }
    ).lean();

    if (!delivery) {
      return NextResponse.json({ delivery: null });
    }

    return NextResponse.json({
      delivery: {
        id: String((delivery as any)._id),
        orderId: String((delivery as any).orderId || ''),
        minecraftUsername: String((delivery as any).minecraftUsername || ''),
        minecraftUuid: String((delivery as any).minecraftUuid || ''),
        commands: Array.isArray((delivery as any).commands) ? (delivery as any).commands : [],
      },
    });
  } catch (err: any) {
    console.error('Delivery next error:', err);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
