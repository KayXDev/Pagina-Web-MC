import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import ReferralProfile from '@/models/ReferralProfile';
import { ensureReferralProfileForUser } from '@/lib/referrals';

export async function GET() {
  try {
    const user = await requireAuth();
    await dbConnect();

    const ensured = await ensureReferralProfileForUser({
      id: String(user.id || ''),
      username: String(user.name || user.email || 'USER'),
    });

    const profile = await ReferralProfile.findOne({ userId: String(user.id || '') }).lean();

    return NextResponse.json({
      code: String((profile as any)?.code || (ensured as any)?.code || ''),
      active: Boolean((profile as any)?.active ?? true),
      invitesCount: Number((profile as any)?.invitesCount || 0),
      successfulInvites: Number((profile as any)?.successfulInvites || 0),
      totalRewardsGiven: Number((profile as any)?.totalRewardsGiven || 0),
    });
  } catch (error: any) {
    if (String(error?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Error al obtener referido' }, { status: 500 });
  }
}
