import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import Ticket from '@/models/Ticket';
import { ticketSchema } from '@/lib/validations';
import Notification from '@/models/Notification';
import User from '@/models/User';

export async function GET() {
  try {
    const user = await requireAuth();
    await dbConnect();
    
    const tickets = await Ticket.find({ userId: user.id }).sort({ createdAt: -1 });
    
    return NextResponse.json(tickets);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { error: 'Error al obtener tickets' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    
    const validatedData = ticketSchema.parse(body);
    
    await dbConnect();
    
    const ticket = await Ticket.create({
      userId: user.id,
      username: user.name,
      email: user.email,
      ...validatedData,
    });

    // Notify staff/admin/owner about new ticket
    try {
      const staffUsers = await User.find(
        { role: { $in: ['STAFF', 'ADMIN', 'OWNER'] } },
        { _id: 1 }
      ).lean();

      if (staffUsers.length > 0) {
        await Notification.bulkWrite(
          staffUsers.map((u: any) => ({
            insertOne: {
              document: {
                userId: String(u._id),
                title: 'Nuevo ticket de soporte',
                message: `Nuevo ticket creado por ${user.name}.`,
                href: '/admin/tickets',
                type: 'INFO',
              },
            },
          }))
        );
      }
    } catch {
      // ignore notification failures
    }
    
    return NextResponse.json(ticket, { status: 201 });
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
    
    console.error('Error creating ticket:', error);
    return NextResponse.json(
      { error: 'Error al crear ticket' },
      { status: 500 }
    );
  }
}
