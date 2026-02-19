import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import TicketPresence from '@/models/TicketPresence';

export const dynamic = 'force-dynamic';

function isStaffRole(role?: string) {
  return role === 'ADMIN' || role === 'STAFF' || role === 'OWNER';
}

async function assertTicketAccess(ticketId: string, user: any) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    return { ok: false as const, status: 404 as const, error: 'Ticket no encontrado' };
  }

  const staff = isStaffRole(user?.role);
  if (!staff && String(ticket.userId) !== String(user?.id)) {
    return { ok: false as const, status: 403 as const, error: 'No autorizado' };
  }

  return { ok: true as const, staff };
}

async function listActive(ticketId: string) {
  const now = Date.now();
  const staleBefore = new Date(now - 30_000);

  await TicketPresence.deleteMany({ ticketId, lastSeen: { $lt: staleBefore } });

  const participants = await TicketPresence.find({ ticketId })
    .sort({ isStaff: -1, username: 1 })
    .lean();

  return participants.map((p: any) => ({
    userId: String(p.userId),
    username: p.username,
    isStaff: Boolean(p.isStaff),
    lastSeen: new Date(p.lastSeen).toISOString(),
  }));
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const access = await assertTicketAccess(params.id, user);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const participants = await listActive(params.id);
    return NextResponse.json({ participants });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error fetching ticket presence:', error);
    return NextResponse.json({ error: 'Error al obtener presencia' }, { status: 500 });
  }
}

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const access = await assertTicketAccess(params.id, user);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const now = new Date();
    const staff = access.staff;

    await TicketPresence.updateOne(
      { ticketId: params.id, userId: String(user.id) },
      {
        $set: {
          username: user?.name || 'User',
          isStaff: staff,
          lastSeen: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, at: now.toISOString() });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error updating ticket presence:', error);
    return NextResponse.json({ error: 'Error al actualizar presencia' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth();
    await dbConnect();

    const access = await assertTicketAccess(params.id, user);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    await TicketPresence.deleteOne({ ticketId: params.id, userId: String(user.id) });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error removing ticket presence:', error);
    return NextResponse.json({ error: 'Error al salir del chat' }, { status: 500 });
  }
}
