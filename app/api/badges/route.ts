import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Badge from '@/models/Badge';

export async function GET() {
  try {
    await dbConnect();
    const items = await Badge.find({ enabled: true })
      .select('slug labelEs labelEn icon enabled')
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json(items);
  } catch {
    return NextResponse.json([]);
  }
}
