import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import StaffApplication from '@/models/StaffApplication';
import { requireAdmin } from '@/lib/session';
import Notification from '@/models/Notification';
import User from '@/models/User';
import Ticket from '@/models/Ticket';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();

    const items = await StaffApplication.find({}).sort({ createdAt: -1 }).limit(500);
    return NextResponse.json(items);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Error fetching staff applications:', error);
    return NextResponse.json({ error: 'Error al obtener postulaciones' }, { status: 500 });
  }
}

const ALLOWED_STATUS = new Set(['NEW', 'REVIEWED', 'ACCEPTED', 'REJECTED']);

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const id = typeof (body as any).id === 'string' ? (body as any).id : '';
    const status = typeof (body as any).status === 'string' ? String((body as any).status).toUpperCase() : '';

    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'status inválido' }, { status: 400 });
    }

    await dbConnect();

    const existing = await StaffApplication.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 });
    }

    if ((existing as any).status === status) {
      return NextResponse.json(existing);
    }

    const updated = await StaffApplication.findByIdAndUpdate(
      id,
      { $set: { status } },
      { returnDocument: 'after' }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: 'Postulación no encontrada' }, { status: 404 });
    }

    // Si se acepta una postulación vinculada a un usuario, abrimos un "chat" reutilizando el sistema de tickets.
    if (status === 'ACCEPTED' && (existing as any).userId) {
      const userId = String((existing as any).userId);
      const currentTicketId = (existing as any).ticketId ? String((existing as any).ticketId) : '';

      let ticketIdToUse = currentTicketId;

      if (!ticketIdToUse) {
        const user = await User.findById(userId).lean();
        if (user) {
          const subject = `Postulación a staff: ${(existing as any).username || (user as any).username || 'Usuario'}`;
          const discord = String((existing as any).discord || '').trim();
          const about = String((existing as any).about || '').trim();

          const ticket = await Ticket.create({
            kind: 'APPLICATION',
            userId,
            username: (user as any).username,
            email: (user as any).email,
            subject,
            category: 'OTHER',
            message:
              `📌 Postulación aceptada. Usa este chat para coordinar con el staff.\n\n` +
              `Discord: ${discord || '—'}\n\n` +
              `Motivación / Respuestas:\n${about || '—'}`,
            status: 'OPEN',
            priority: 'MEDIUM',
          });

          ticketIdToUse = String(ticket._id);

          await StaffApplication.findByIdAndUpdate(id, { $set: { ticketId: ticketIdToUse } });
          (updated as any).ticketId = ticketIdToUse;
        }
      }

      await Notification.create({
        userId,
        title: 'Postulación aceptada',
        message: ticketIdToUse
          ? 'Tu postulación a staff fue aceptada. Se abrió un chat para hablar con el staff.'
          : 'Tu postulación a staff fue aceptada. Te contactaremos pronto.',
        href: ticketIdToUse ? `/soporte/${ticketIdToUse}` : '/perfil',
        type: 'SUCCESS',
      });
    }

    if (status === 'REJECTED' && (existing as any).userId) {
      const userId = String((existing as any).userId);
      await Notification.create({
        userId,
        title: 'Postulación rechazada',
        message: 'Tu postulación a staff fue rechazada. Gracias por postular.',
        href: '/perfil',
        type: 'WARNING',
      });
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Error updating staff application:', error);
    return NextResponse.json({ error: 'Error al actualizar postulación' }, { status: 500 });
  }
}
