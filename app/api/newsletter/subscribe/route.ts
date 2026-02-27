import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import { normalizeLang } from '@/lib/i18n';

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
    const rawLang = body?.lang;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
    }

    await dbConnect();

    const setDoc: any = {
      email,
      source,
      subscribedAt: new Date(),
      unsubscribedAt: null,
    };

    if (rawLang !== undefined && rawLang !== null) {
      setDoc.lang = normalizeLang(String(rawLang).trim());
    }

    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      {
        $set: setDoc,
      },
      { upsert: true, returnDocument: 'after' }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return NextResponse.json({ error: 'Error suscribiendo' }, { status: 500 });
  }
}
