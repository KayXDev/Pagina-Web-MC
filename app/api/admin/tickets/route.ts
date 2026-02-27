import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import AdminLog from '@/models/AdminLog';

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function GET() {
  try {
    await requireStaff();
    await dbConnect();
    
    // Orden por última actividad: lo que se está moviendo/respondiendo arriba.
    const tickets = await Ticket.find({
      kind: { $ne: 'APPLICATION' },
      // Back-compat: exclude old application-chat tickets created before `kind` existed.
      subject: { $not: /^Postulación a staff:/i },
    }).sort({ updatedAt: -1, createdAt: -1 });
    
    return NextResponse.json(tickets);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al obtener tickets' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const staff = await requireStaff();
    const { ticketId, updates } = await request.json();
    
    await dbConnect();
    
    const ticket = await Ticket.findByIdAndUpdate(ticketId, updates, { returnDocument: 'after' });
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }
    
    await AdminLog.create({
      adminId: staff.id,
      adminUsername: staff.name,
      action: 'UPDATE_TICKET',
      targetType: 'TICKET',
      targetId: ticketId,
      details: JSON.stringify(updates),
      meta: {
        updates,
        path: '/api/admin/tickets',
        method: 'PATCH',
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    });
    
    return NextResponse.json(ticket);
  } catch (error: any) {
    if (error.message === 'Unauthorized' || error.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }
    
    return NextResponse.json(
      { error: 'Error al actualizar ticket' },
      { status: 500 }
    );
  }
}
