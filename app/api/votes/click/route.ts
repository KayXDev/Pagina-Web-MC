import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import VoteEvent from '@/models/VoteEvent';

const COOLDOWN_HOURS = 20;

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const siteRaw = typeof (body as any)?.site === 'string' ? (body as any).site : '';
    const site = String(siteRaw).trim().slice(0, 80);

    if (!site) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    await dbConnect();

    const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
    const existing = await VoteEvent.findOne({ userId: user.id, site, createdAt: { $gte: since } })
      .select('_id')
      .lean();

    if (existing) {
      return NextResponse.json({ ok: true, recorded: false, cooldownHours: COOLDOWN_HOURS });
    }

    await VoteEvent.create({
      userId: user.id,
      username: String((user as any)?.name || (user as any)?.email || 'User').slice(0, 32),
      site,
    });

    return NextResponse.json({ ok: true, recorded: true, cooldownHours: COOLDOWN_HOURS });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('votes/click error:', error);
    return NextResponse.json({ ok: false, error: 'Server Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
