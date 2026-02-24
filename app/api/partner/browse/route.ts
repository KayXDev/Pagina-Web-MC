import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import PartnerAd from '@/models/PartnerAd';

export const dynamic = 'force-dynamic';

const schema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(24),
  cursor: z.string().optional().or(z.literal('')),
  exclude: z.string().optional().or(z.literal('')),
});

function parseCursor(raw: string | undefined): { createdAt: Date; id: string } | null {
  const v = String(raw || '').trim();
  if (!v) return null;
  try {
    const decoded = Buffer.from(v, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded);
    const createdAt = new Date(String(parsed?.createdAt || ''));
    const id = String(parsed?.id || '').trim();
    if (!id || !Number.isFinite(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

function makeCursor(createdAt: any, id: any): string {
  const payload = JSON.stringify({ createdAt: new Date(createdAt).toISOString(), id: String(id) });
  return Buffer.from(payload, 'utf8').toString('base64');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = schema.safeParse({
      limit: searchParams.get('limit') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      exclude: searchParams.get('exclude') ?? undefined,
    });

    if (!parsed.success) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });

    await dbConnect();

    const excludeIds = String(parsed.data.exclude || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const query: any = { status: 'APPROVED' };
    if (excludeIds.length) query._id = { $nin: excludeIds };

    const c = parseCursor(parsed.data.cursor);
    if (c) {
      query.$or = [
        { createdAt: { $lt: c.createdAt } },
        { createdAt: c.createdAt, _id: { $lt: c.id } },
      ];
    }

    const rows = await PartnerAd.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(parsed.data.limit)
      .select('serverName ownerUsername address version description website discord banner createdAt')
      .lean();

    const items = (rows as any[]).map((a) => ({
      _id: String(a._id),
      serverName: String(a.serverName || ''),
      ownerUsername: String(a.ownerUsername || ''),
      address: String(a.address || ''),
      version: String(a.version || ''),
      description: String(a.description || ''),
      website: String(a.website || ''),
      discord: String(a.discord || ''),
      banner: String(a.banner || ''),
      createdAt: a.createdAt,
    }));

    const nextCursor = items.length ? makeCursor((rows as any[])[items.length - 1].createdAt, (rows as any[])[items.length - 1]._id) : '';

    return NextResponse.json({ items, nextCursor });
  } catch (error: any) {
    console.error('Partner browse error:', error);
    return NextResponse.json({ error: 'Error' }, { status: 500 });
  }
}

export const runtime = 'nodejs';
