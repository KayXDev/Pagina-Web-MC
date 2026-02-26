import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import NewsletterSubscriber from '@/models/NewsletterSubscriber';
import { verifyUnsubscribeToken } from '@/lib/newsletterTokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = String(url.searchParams.get('token') || '').trim();
  const email = verifyUnsubscribeToken(token);

  try {
    if (email) {
      await dbConnect();
      await NewsletterSubscriber.updateOne(
        { email },
        {
          $set: {
            unsubscribedAt: new Date(),
          },
        }
      );
    }
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
  }

  const redirectTo = new URL('/', url.origin);
  redirectTo.searchParams.set('newsletter', 'unsubscribed');
  return NextResponse.redirect(redirectTo);
}
