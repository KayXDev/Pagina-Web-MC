import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const revalidate = 0;

export async function GET(request: Request) {
  try {
    await dbConnect();
    const staffUsers = await User.find({
      role: { $in: ['STAFF', 'ADMIN', 'OWNER'] },
      isBanned: false,
    })
      .select('username role avatar verified lastLogin')
      .lean();

    const roleWeight: Record<string, number> = { OWNER: 0, ADMIN: 1, STAFF: 2 };

    const ordered = staffUsers
      .slice()
      .sort((a: any, b: any) => {
        const wa = roleWeight[String(a.role || 'STAFF')] ?? 99;
        const wb = roleWeight[String(b.role || 'STAFF')] ?? 99;
        if (wa !== wb) return wa - wb;
        return String(a.username || '').localeCompare(String(b.username || ''), 'es', { sensitivity: 'base' });
      });

    return NextResponse.json({
      online: true,
      count: ordered.length,
      staff: ordered.map((u: any) => ({
        username: String(u.username || ''),
        role: String(u.role || 'STAFF'),
        avatar: String(u.avatar || ''),
        verified: Boolean(u.verified),
        lastLogin: u.lastLogin ? new Date(u.lastLogin).toISOString() : null,
      })),
    });
  } catch (error) {
    console.error('Staff online error:', error);
    return NextResponse.json({ error: 'Error al obtener staff' }, { status: 500 });
  }
}
