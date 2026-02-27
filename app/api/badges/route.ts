import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Badge from '@/models/Badge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await dbConnect();
    const items = await Badge.find({ enabled: true })
      .select('slug labelEs labelEn icon enabled')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(items, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch {
    return NextResponse.json([], {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  }
}
