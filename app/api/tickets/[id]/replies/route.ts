import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import TicketReply from '@/models/TicketReply';
import Notification from '@/models/Notification';

const replySchema = z.object({
  message: z.string().min(1, 'El mensaje es requerido').max(2000, 'Mensaje demasiado largo'),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const validated = replySchema.parse(body);

    await dbConnect();

    const ticket = await Ticket.findById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'STAFF' || user.role === 'OWNER';
    const isOwner = ticket.userId === user.id;
    if (!isStaff && !isOwner) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (ticket.status === 'CLOSED') {
      return NextResponse.json({ error: 'El ticket está cerrado' }, { status: 400 });
    }

    const reply = await TicketReply.create({
      ticketId: params.id,
      userId: user.id,
      username: user.name,
      message: validated.message,
      isStaff,
    });

    if (isStaff && ticket.userId && ticket.userId !== user.id) {
      await Notification.create({
        userId: String(ticket.userId),
        title: 'Respuesta en tu ticket',
        message: 'El staff respondió a tu ticket. Entra a soporte para ver el mensaje.',
        href: `/soporte/${params.id}`,
        type: 'INFO',
      });
    }

    // Marca actividad en el ticket y, si responde staff, pásalo a EN PROCESO.
    if (isStaff && ticket.status === 'OPEN') {
      ticket.status = 'IN_PROGRESS';
    }
    ticket.updatedAt = new Date();
    await ticket.save();

    return NextResponse.json(reply, { status: 201 });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating ticket reply:', error);
    return NextResponse.json({ error: 'Error al responder ticket' }, { status: 500 });
  }
}
