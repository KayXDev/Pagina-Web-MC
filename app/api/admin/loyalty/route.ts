import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import dbConnect from '@/lib/mongodb';
import AdminLog from '@/models/AdminLog';
import LoyaltyEvent from '@/models/LoyaltyEvent';
import Settings from '@/models/Settings';
import User from '@/models/User';
import { getLoyaltyConfig } from '@/lib/loyalty';

type LeanUser = {
  _id: string;
  username: string;
  email: string;
  role: string;
  loyaltyPoints?: number;
  loyaltyLifetimePoints?: number;
  loyaltyLastEarnedAt?: Date | string | null;
};

function getRequestIp(request: Request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip') || '';
}

export async function GET() {
  try {
    await requireAdmin();
    await dbConnect();

    const [users, events, totals, loyaltyConfig] = await Promise.all([
      User.find({}, 'username email role loyaltyPoints loyaltyLifetimePoints loyaltyLastEarnedAt createdAt')
        .sort({ loyaltyPoints: -1, loyaltyLifetimePoints: -1, createdAt: -1 })
        .limit(250)
        .lean(),
      LoyaltyEvent.find({}, 'userId orderId type points amountSpent currency description createdAt meta')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      User.aggregate([
        {
          $group: {
            _id: null,
            totalPoints: { $sum: { $ifNull: ['$loyaltyPoints', 0] } },
            totalLifetimePoints: { $sum: { $ifNull: ['$loyaltyLifetimePoints', 0] } },
            usersWithPoints: {
              $sum: {
                $cond: [{ $gt: [{ $ifNull: ['$loyaltyPoints', 0] }, 0] }, 1, 0],
              },
            },
          },
        },
      ]),
      getLoyaltyConfig(),
    ]);

    const userList = Array.isArray(users) ? (users as unknown as LeanUser[]) : [];
    const userMap = new Map(userList.map((user) => [String(user._id), user]));

    const missingIds = Array.from(
      new Set(
        (Array.isArray(events) ? events : [])
          .map((event: any) => String(event.userId || ''))
          .filter((id) => id && !userMap.has(id))
      )
    );

    if (missingIds.length) {
      const missingUsers = await User.find({ _id: { $in: missingIds } }, 'username email role loyaltyPoints loyaltyLifetimePoints loyaltyLastEarnedAt')
        .lean()
        .catch(() => []);
      for (const user of Array.isArray(missingUsers) ? (missingUsers as unknown as LeanUser[]) : []) {
        userMap.set(String(user._id), user);
      }
    }

    const summary = Array.isArray(totals) && totals[0]
      ? totals[0]
      : { totalPoints: 0, totalLifetimePoints: 0, usersWithPoints: 0 };
    return NextResponse.json({
      config: {
        earningPointsPerEuro: Number(loyaltyConfig?.earningPointsPerEuro || 10),
        redemptionPointsPerEuro: Number(loyaltyConfig?.redemptionPointsPerEuro || 100),
        balancePointsPerEuro: Number(loyaltyConfig?.balancePointsPerEuro || 100),
      },
      summary: {
        totalPoints: Number(summary.totalPoints || 0),
        totalLifetimePoints: Number(summary.totalLifetimePoints || 0),
        usersWithPoints: Number(summary.usersWithPoints || 0),
        totalEvents: Array.isArray(events) ? events.length : 0,
      },
      users: userList.map((user) => ({
        _id: String(user._id),
        username: String(user.username || ''),
        email: String(user.email || ''),
        role: String(user.role || 'USER'),
        loyaltyPoints: Number(user.loyaltyPoints || 0),
        loyaltyLifetimePoints: Number(user.loyaltyLifetimePoints || 0),
        loyaltyLastEarnedAt: user.loyaltyLastEarnedAt || null,
      })),
      recentEvents: (Array.isArray(events) ? events : []).map((event: any) => ({
        _id: String(event._id || ''),
        userId: String(event.userId || ''),
        username: String(userMap.get(String(event.userId || ''))?.username || 'Unknown'),
        type: String(event.type || ''),
        points: Number(event.points || 0),
        amountSpent: Number(event.amountSpent || 0),
        currency: String(event.currency || 'EUR'),
        description: String(event.description || ''),
        createdAt: event.createdAt || null,
        meta: event.meta || undefined,
      })),
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Error fetching loyalty admin data:', error);
    return NextResponse.json({ error: 'Error al cargar loyalty' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await requireAdmin();
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || 'adjust').trim().toLowerCase();
    if (action === 'update_config') {
      const nextConfig = {
        loyalty_earning_points_per_euro: Math.max(1, Math.floor(Number(body?.earningPointsPerEuro || 0))),
        loyalty_redemption_points_per_euro: Math.max(1, Math.floor(Number(body?.redemptionPointsPerEuro || 0))),
        loyalty_balance_points_per_euro: Math.max(1, Math.floor(Number(body?.balancePointsPerEuro || 0))),
      };

      await Promise.all(
        Object.entries(nextConfig).map(([key, value]) =>
          Settings.findOneAndUpdate(
            { key },
            { key, value: String(value), updatedAt: new Date() },
            { upsert: true, returnDocument: 'after' }
          )
        )
      );

      await AdminLog.create({
        adminId: admin.id,
        adminUsername: admin.name,
        action: 'UPDATE_LOYALTY_CONFIG',
        targetType: 'SETTINGS',
        targetId: 'loyalty',
        details: JSON.stringify(nextConfig),
        meta: {
          path: '/api/admin/loyalty',
          method: 'PATCH',
          action,
          ...nextConfig,
          userAgent: request.headers.get('user-agent') || undefined,
        },
        ipAddress: getRequestIp(request) || undefined,
      }).catch(() => null);

      return NextResponse.json({ ok: true, config: nextConfig });
    }

    const userId = String(body?.userId || '').trim();
    const note = String(body?.note || '').trim().slice(0, 240);

    if (!userId) {
      return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 });
    }

    const user = await User.findById(userId).select('username loyaltyPoints loyaltyLifetimePoints loyaltyLastEarnedAt').lean();
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const previousPoints = Math.max(0, Math.floor(Number((user as any).loyaltyPoints || 0)));
    const previousLifetimePoints = Math.max(0, Math.floor(Number((user as any).loyaltyLifetimePoints || 0)));
    let nextPoints = previousPoints;
    let nextLifetimePoints = previousLifetimePoints;
    let pointsDelta = 0;
    let lifetimeDelta = 0;
    let eventType: 'ADMIN_ADJUSTED' | 'ADMIN_SENT' = 'ADMIN_ADJUSTED';
    let actionLabel = 'UPDATE_LOYALTY_POINTS';

    if (action === 'send') {
      const pointsToSend = Math.max(1, Math.floor(Number(body?.pointsToSend || 0)));
      if (!Number.isFinite(pointsToSend) || pointsToSend <= 0) {
        return NextResponse.json({ error: 'Cantidad de puntos inválida' }, { status: 400 });
      }

      nextPoints = previousPoints + pointsToSend;
      nextLifetimePoints = previousLifetimePoints + pointsToSend;
      pointsDelta = pointsToSend;
      lifetimeDelta = pointsToSend;
      eventType = 'ADMIN_SENT';
      actionLabel = 'SEND_LOYALTY_POINTS';
    } else {
      nextPoints = Math.max(0, Math.floor(Number(body?.loyaltyPoints || 0)));
      nextLifetimePoints = Math.max(nextPoints, Math.floor(Number(body?.loyaltyLifetimePoints ?? nextPoints)));
      pointsDelta = nextPoints - previousPoints;
      lifetimeDelta = nextLifetimePoints - previousLifetimePoints;
    }

    if (pointsDelta === 0 && lifetimeDelta === 0) {
      return NextResponse.json({
        ok: true,
        user: {
          _id: String((user as any)._id || userId),
          username: String((user as any).username || ''),
          loyaltyPoints: previousPoints,
          loyaltyLifetimePoints: previousLifetimePoints,
          loyaltyLastEarnedAt: (user as any).loyaltyLastEarnedAt || null,
        },
      });
    }

    const nextLastEarnedAt = pointsDelta > 0 || lifetimeDelta > 0 ? new Date() : (user as any).loyaltyLastEarnedAt || null;

    await User.updateOne(
      { _id: userId },
      {
        $set: {
          loyaltyPoints: nextPoints,
          loyaltyLifetimePoints: nextLifetimePoints,
          loyaltyLastEarnedAt: nextLastEarnedAt,
        },
      }
    );

    await LoyaltyEvent.create({
      userId,
      type: eventType,
      points: pointsDelta,
      amountSpent: 0,
      currency: 'PTS',
      description:
        note ||
        (action === 'send'
          ? `Envio manual de ${pointsDelta} puntos loyalty`
          : `Ajuste manual de loyalty: ${previousPoints} -> ${nextPoints}${lifetimeDelta !== 0 ? ` | historico: ${previousLifetimePoints} -> ${nextLifetimePoints}` : ''}`),
      meta: {
        adminId: admin.id,
        adminUsername: admin.name,
        action,
        previousPoints,
        nextPoints,
        previousLifetimePoints,
        nextLifetimePoints,
        lifetimeDelta,
      },
    }).catch(() => null);

    await AdminLog.create({
      adminId: admin.id,
      adminUsername: admin.name,
      action: actionLabel,
      targetType: 'USER',
      targetId: userId,
      details: JSON.stringify({
        username: String((user as any).username || ''),
        action,
        previousPoints,
        nextPoints,
        previousLifetimePoints,
        nextLifetimePoints,
        note,
      }),
      meta: {
        path: '/api/admin/loyalty',
        method: 'PATCH',
        action,
        pointsDelta,
        lifetimeDelta,
        note: note || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      },
      ipAddress: getRequestIp(request) || undefined,
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      user: {
        _id: userId,
        username: String((user as any).username || ''),
        loyaltyPoints: nextPoints,
        loyaltyLifetimePoints: nextLifetimePoints,
        loyaltyLastEarnedAt: nextLastEarnedAt,
      },
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden: Admin access required') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    console.error('Error updating loyalty admin data:', error);
    return NextResponse.json({ error: 'Error al actualizar loyalty' }, { status: 500 });
  }
}
