import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import AdminLog from '@/models/AdminLog';
import { buildTicketSlaDates } from '@/lib/ticketSla';

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
    
    const ticket = await Ticket.findById(ticketId);
    
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    const nextUpdates = typeof updates === 'object' && updates ? updates : {};
    const nextStatus = typeof nextUpdates.status === 'string' ? String(nextUpdates.status).toUpperCase() : null;
    const nextPriority = typeof nextUpdates.priority === 'string' ? String(nextUpdates.priority).toUpperCase() : null;
    const assignToMe = Boolean(nextUpdates.assignToMe);
    const clearAssignment = Boolean(nextUpdates.clearAssignment);
    const assignedStaffName = typeof nextUpdates.assignedStaffName === 'string' ? String(nextUpdates.assignedStaffName).trim() : null;

    if (nextStatus && ['OPEN', 'IN_PROGRESS', 'CLOSED'].includes(nextStatus)) {
      (ticket as any).status = nextStatus;
      if (nextStatus === 'CLOSED') {
        (ticket as any).resolvedAt = new Date();
      } else if ((ticket as any).resolvedAt) {
        (ticket as any).resolvedAt = undefined;
      }
    }

    if (nextPriority && ['LOW', 'MEDIUM', 'HIGH'].includes(nextPriority)) {
      (ticket as any).priority = nextPriority;
      const baseDate = new Date((ticket as any).createdAt || Date.now());
      const slaDates = buildTicketSlaDates(nextPriority, baseDate);
      if (!(ticket as any).firstStaffReplyAt) {
        (ticket as any).responseDueAt = slaDates.responseDueAt;
      }
      if ((ticket as any).status !== 'CLOSED') {
        (ticket as any).resolutionDueAt = slaDates.resolutionDueAt;
      }
    }

    if (assignToMe) {
      (ticket as any).assignedStaffId = String(staff.id || '');
      (ticket as any).assignedStaffName = String(staff.name || 'Staff');
      (ticket as any).assignedAt = new Date();
      if ((ticket as any).status === 'OPEN') {
        (ticket as any).status = 'IN_PROGRESS';
      }
    } else if (clearAssignment) {
      (ticket as any).assignedStaffId = '';
      (ticket as any).assignedStaffName = '';
      (ticket as any).assignedAt = undefined;
    } else if (assignedStaffName !== null) {
      (ticket as any).assignedStaffId = String((ticket as any).assignedStaffId || '');
      (ticket as any).assignedStaffName = assignedStaffName;
      (ticket as any).assignedAt = assignedStaffName ? new Date() : undefined;
      if (assignedStaffName && (ticket as any).status === 'OPEN') {
        (ticket as any).status = 'IN_PROGRESS';
      }
    }

    if (!(ticket as any).responseDueAt || !(ticket as any).resolutionDueAt) {
      const fallbackDates = buildTicketSlaDates(String((ticket as any).priority || 'MEDIUM'), new Date((ticket as any).createdAt || Date.now()));
      (ticket as any).responseDueAt = (ticket as any).responseDueAt || fallbackDates.responseDueAt;
      (ticket as any).resolutionDueAt = (ticket as any).resolutionDueAt || fallbackDates.resolutionDueAt;
    }

    await ticket.save();
    
    await AdminLog.create({
      adminId: staff.id,
      adminUsername: staff.name,
      action: 'UPDATE_TICKET',
      targetType: 'TICKET',
      targetId: ticketId,
      details: JSON.stringify(nextUpdates),
      meta: {
        updates: nextUpdates,
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
