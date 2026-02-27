import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const currentUser = await requireAuth();
    await dbConnect();

    const now = new Date();
    await User.updateOne({ _id: currentUser.id }, { $set: { lastSeenAt: now } });

    return NextResponse.json({ ok: true, at: now.toISOString() });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Presence ping error:', error);
    return NextResponse.json({ error: 'Error al actualizar presencia' }, { status: 500 });
  }
}
