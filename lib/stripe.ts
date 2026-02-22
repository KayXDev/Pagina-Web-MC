import Stripe from 'stripe';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = String(process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secretKey) {
    throw new Error('Stripe no configurado: falta STRIPE_SECRET_KEY');
  }

  stripeClient = new Stripe(secretKey, {
    // Keep the API version explicit for stable behavior.
    apiVersion: '2026-01-28.clover',
    typescript: true,
  });

  return stripeClient;
}

export function toStripeAmount(amount: number): number {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error('Importe inválido');
  // Prices in this project are stored as major currency units (e.g. EUR).
  return Math.max(1, Math.round(n * 100));
}
