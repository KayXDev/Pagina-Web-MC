import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email || '').trim().toLowerCase();
    const source = String(body?.source || 'footer').trim() || 'footer';

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    await dbConnect();

    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          source,
          subscribedAt: new Date(),
          unsubscribedAt: null,
        },
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json({ error: 'Error suscribiendo' }, { status: 500 });
  }
}
