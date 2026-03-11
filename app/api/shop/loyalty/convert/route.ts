import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/mongodb';
import LoyaltyEvent from '@/models/LoyaltyEvent';
import User from '@/models/User';
import { calculateBalanceFromLoyaltyPoints, getLoyaltyConfig } from '@/lib/loyalty';
import { requireAuth } from '@/lib/session';

const schema = z.object({
  points: z.number().int().min(1),
});

export async function POST(request: Request) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    await dbConnect();
    const loyaltyConfig = await getLoyaltyConfig();

    const user = await User.findById(currentUser.id).select('username loyaltyPoints balance').lean();
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const availablePoints = Math.max(0, Math.floor(Number((user as any).loyaltyPoints || 0)));
    const points = Math.max(1, Math.floor(Number(parsed.data.points || 0)));
    if (points > availablePoints) {
      return NextResponse.json({ error: 'No tienes tantos puntos disponibles' }, { status: 400 });
    }

    const balanceAmount = calculateBalanceFromLoyaltyPoints(points, loyaltyConfig);
    if (balanceAmount <= 0) {
      return NextResponse.json({ error: 'La conversión no genera saldo válido' }, { status: 400 });
    }

    const nextBalance = Math.round(((Number((user as any).balance || 0) + balanceAmount) + Number.EPSILON) * 100) / 100;

    await User.updateOne(
      { _id: currentUser.id },
      {
        $inc: {
          loyaltyPoints: -points,
          balance: balanceAmount,
        },
      }
    );

    await LoyaltyEvent.create({
      userId: currentUser.id,
      type: 'POINTS_CONVERTED_TO_BALANCE',
      points: -points,
      amountSpent: balanceAmount,
      currency: String(process.env.SHOP_CURRENCY || 'EUR').toUpperCase(),
      description: `Conversión de ${points} puntos loyalty a saldo de tienda`,
      meta: {
        balanceAmount,
        balancePointsPerEuro: loyaltyConfig.balancePointsPerEuro,
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      convertedPoints: points,
      balanceAmount,
      balancePointsPerEuro: loyaltyConfig.balancePointsPerEuro,
      loyaltyPoints: availablePoints - points,
      balance: nextBalance,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    console.error('Error converting loyalty points to balance:', error);
    return NextResponse.json({ error: 'No se pudieron convertir los puntos' }, { status: 500 });
  }
}

export const runtime = 'nodejs';