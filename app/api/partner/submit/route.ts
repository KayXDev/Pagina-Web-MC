import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import { requireAuth } from '@/lib/session';
import PartnerAd from '@/models/PartnerAd';

export const dynamic = 'force-dynamic';

const schema = z.object({
  note: z.string().min(20).max(300),

  serverName: z.string().min(3).max(60),
  address: z.string().min(3).max(80),
  version: z.string().max(30).optional().or(z.literal('')),
  description: z.string().min(20).max(500),
  website: z.string().max(200).optional().or(z.literal('')),
  discord: z.string().max(200).optional().or(z.literal('')),
  banner: z.string().max(500).optional().or(z.literal('')),
});

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    const existingAd = await PartnerAd.findOne({ userId: user.id }).lean();

    const ownerUsername = String((user as any).name || user.email || '');

    const nextData = {
      ownerUsername,
      serverName: parsed.data.serverName,
      address: parsed.data.address,
      version: parsed.data.version || '',
      description: parsed.data.description,
      website: parsed.data.website || '',
      discord: parsed.data.discord || '',
      banner: parsed.data.banner || '',
      submissionNote: String(parsed.data.note || '').trim(),
    };

    if (!existingAd) {
      const created = await PartnerAd.create({
        userId: user.id,
        ...nextData,
        status: 'PENDING_REVIEW',
        rejectionReason: '',
      });
      return NextResponse.json({ ok: true, adId: String(created._id) });
    }

    const current = existingAd as any;
    const changed =
      String(current.ownerUsername || '') !== String(nextData.ownerUsername || '') ||
      String(current.serverName || '') !== String(nextData.serverName || '') ||
      String(current.address || '') !== String(nextData.address || '') ||
      String(current.version || '') !== String(nextData.version || '') ||
      String(current.description || '') !== String(nextData.description || '') ||
      String(current.website || '') !== String(nextData.website || '') ||
      String(current.discord || '') !== String(nextData.discord || '') ||
      String(current.banner || '') !== String(nextData.banner || '');

    const nextStatus = String(current.status) === 'APPROVED' && !changed ? 'APPROVED' : 'PENDING_REVIEW';

    await PartnerAd.updateOne(
      { _id: current._id, userId: user.id },
      {
        $set: {
          ...nextData,
          status: nextStatus,
          rejectionReason: nextStatus === 'PENDING_REVIEW' ? '' : String(current.rejectionReason || ''),
        },
      }
    );

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (error: any) {
    console.error('Partner submit error:', error);
    const message = String(error?.message || 'Error');
    const status = message.includes('Unauthorized') ? 401 : message.includes('Forbidden') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export const runtime = 'nodejs';
