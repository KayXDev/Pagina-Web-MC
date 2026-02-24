import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import VoteEvent from '@/models/VoteEvent';

function clampInt(value: string | null, def: number, min: number, max: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return def;
  return Math.min(max, Math.max(min, n));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const days = clampInt(url.searchParams.get('days'), 30, 1, 365);
    const limit = clampInt(url.searchParams.get('limit'), 10, 1, 50);

    await dbConnect();

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const items = await VoteEvent.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$userId',
          username: { $last: '$username' },
          votes: { $sum: 1 },
        },
      },
      { $sort: { votes: -1, username: 1 } },
      { $limit: limit },
      { $project: { _id: 0, userId: '$_id', username: 1, votes: 1 } },
    ]);

    return NextResponse.json({ days, limit, items });
  } catch (error) {
    console.error('votes/leaderboard error:', error);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
