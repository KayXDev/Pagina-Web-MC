import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await dbConnect();

    const setting = await Settings.findOne({ key: 'staff_applications_open' }).lean();
    if (!setting) {
      const openFallback = process.env.NEXT_PUBLIC_STAFF_APPLICATIONS_OPEN === 'true';
      return NextResponse.json({ open: openFallback });
    }

    const open = setting.value === 'true';

    return NextResponse.json({ open });
  } catch (error) {
    const openFallback = process.env.NEXT_PUBLIC_STAFF_APPLICATIONS_OPEN === 'true';
    return NextResponse.json({ open: openFallback });
  }
}
