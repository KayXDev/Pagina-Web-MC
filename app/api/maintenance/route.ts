import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Settings from '@/models/Settings';

export async function GET() {
  try {
    await dbConnect();

    const rows = await Settings.find(
      { key: { $in: ['maintenance_mode', 'maintenance_message'] } },
      { key: 1, value: 1 }
    ).lean();

    const map = new Map<string, string>();
    for (const r of rows as any[]) map.set(String(r.key), String(r.value ?? ''));

    const enabled = map.get('maintenance_mode') === 'true';
    const message = map.get('maintenance_message') || 'Estamos en mantenimiento. Vuelve más tarde.';

    return NextResponse.json({ enabled, message });
  } catch (error) {
    // En caso de error de DB, por seguridad NO bloqueamos
    return NextResponse.json({ enabled: false, message: '' });
  }
}
