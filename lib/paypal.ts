type PayPalEnv = 'sandbox' | 'live';

type PayPalAccessTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

type PayPalLink = {
  href: string;
  rel: string;
  method?: string;
};

type PayPalCreateOrderResponse = {
  id: string;
  status: string;
  links?: PayPalLink[];
};

type PayPalCaptureOrderResponse = {
  id: string;
  status: string;
  payer?: {
    payer_id?: string;
    email_address?: string;
  };
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
      }>;
    };
  }>;
};

function getPayPalEnv(): PayPalEnv {
  const raw = String(process.env.PAYPAL_ENV || process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
  return raw === 'live' ? 'live' : 'sandbox';
}

function getPayPalBaseUrl(): string {
  return getPayPalEnv() === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

function getPayPalCredentials(): { clientId: string; clientSecret: string } {
  const clientId = String(process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.PAYPAL_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    throw new Error('PayPal no configurado: faltan PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET');
  }
  return { clientId, clientSecret };
}

type TokenCache = { token: string; expiresAtMs: number };

declare global {
  // eslint-disable-next-line no-var
  var __paypalTokenCache: TokenCache | undefined;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  const cached = globalThis.__paypalTokenCache;
  if (cached && cached.token && cached.expiresAtMs - 30_000 > now) return cached.token;

  const { clientId, clientSecret } = getPayPalCredentials();
  const base = getPayPalBaseUrl();

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => ({}))) as Partial<PayPalAccessTokenResponse>;
  if (!res.ok || !data.access_token || !data.expires_in) {
    throw new Error('No se pudo autenticar con PayPal');
  }

  globalThis.__paypalTokenCache = {
    token: data.access_token,
    expiresAtMs: now + Number(data.expires_in) * 1000,
  };

  return data.access_token;
}

function toAmountValue(amount: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return '0.00';
  const rounded = Math.round(n * 100) / 100;
  return rounded.toFixed(2);
}

export async function paypalCreateOrder(params: {
  totalPrice: number;
  currency: string;
  description: string;
  customId: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ paypalOrderId: string; approvalUrl: string; status: string }> {
  const token = await getAccessToken();
  const base = getPayPalBaseUrl();

  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: String(params.currency || 'EUR').toUpperCase(),
            value: toAmountValue(params.totalPrice),
          },
          description: params.description,
          custom_id: params.customId,
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    }),
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => ({}))) as Partial<PayPalCreateOrderResponse>;
  if (!res.ok || !data.id) {
    throw new Error('No se pudo crear la orden en PayPal');
  }

  const approvalUrl = (data.links || []).find((l) => l.rel === 'approve')?.href;
  if (!approvalUrl) {
    throw new Error('PayPal no devolvió un link de aprobación');
  }

  return { paypalOrderId: data.id, approvalUrl, status: String(data.status || '') };
}

export async function paypalCaptureOrder(paypalOrderId: string): Promise<{
  status: string;
  captureId: string;
  payerId: string;
  payerEmail: string;
}> {
  const token = await getAccessToken();
  const base = getPayPalBaseUrl();

  const res = await fetch(`${base}/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  const data = (await res.json().catch(() => ({}))) as Partial<PayPalCaptureOrderResponse>;
  if (!res.ok || !data.id) {
    throw new Error('No se pudo capturar el pago en PayPal');
  }

  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  const captureId = String(capture?.id || '');
  const payerId = String(data.payer?.payer_id || '');
  const payerEmail = String(data.payer?.email_address || '');

  return {
    status: String(data.status || ''),
    captureId,
    payerId,
    payerEmail,
  };
}
