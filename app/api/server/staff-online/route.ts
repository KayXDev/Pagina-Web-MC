import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { getServerStatus } from '@/lib/minecraft';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const host = searchParams.get('host') || process.env.MINECRAFT_SERVER_IP || 'localhost';
    const port = parseInt(searchParams.get('port') || process.env.MINECRAFT_SERVER_PORT || '25565');

    const status = await getServerStatus(host, port);
    const playerList = Array.isArray(status?.players?.list) ? status.players.list : [];
    const playerSet = new Set(playerList.map((p) => String(p || '').trim()).filter(Boolean));

    if (!status?.online || playerSet.size === 0) {
      return NextResponse.json({
        online: Boolean(status?.online),
        count: 0,
        staff: [],
      });
    }

    await dbConnect();
    const staffUsers = await User.find({
      role: { $in: ['STAFF', 'ADMIN', 'OWNER'] },
      isBanned: false,
      minecraftUsername: { $in: Array.from(playerSet) },
    })
      .select('username role minecraftUsername minecraftUuid avatar')
      .lean();

    const byMc = new Map<string, any>();
    for (const u of staffUsers) {
      const mc = String((u as any).minecraftUsername || '').trim();
      if (mc) byMc.set(mc.toLowerCase(), u);
    }

    const ordered = playerList
      .map((p) => byMc.get(String(p || '').trim().toLowerCase()))
      .filter(Boolean);

    return NextResponse.json({
      online: true,
      count: ordered.length,
      staff: ordered.map((u: any) => ({
        username: String(u.username || ''),
        role: String(u.role || 'STAFF'),
        minecraftUsername: String(u.minecraftUsername || ''),
        minecraftUuid: String(u.minecraftUuid || ''),
        avatar: String(u.avatar || ''),
      })),
    });
  } catch (error) {
    console.error('Staff online error:', error);
    return NextResponse.json({ error: 'Error al obtener staff online' }, { status: 500 });
  }
}
