'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card } from '@/components/ui';
import { useClientLang } from '@/lib/useClientLang';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = String(document.cookie || '').split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const attrs = [
    `Path=/`,
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`,
    `SameSite=Lax`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ');
  document.cookie = `${name}=${encodeURIComponent(value)}; ${attrs}`;
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const lang = useClientLang();

  useEffect(() => {
    const existing = getCookie('cookie_consent');
    if (existing === 'accepted' || existing === 'rejected') {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, []);

  const copy = useMemo(() => {
    if (lang === 'en') {
      return {
        title: 'Cookies',
        text: 'We use cookies to improve your experience and to keep essential features working.',
        accept: 'Accept',
        reject: 'Reject',
        policy: 'Privacy policy',
        essential: 'Essential',
      };
    }

    return {
      title: 'Cookies',
      text: 'Usamos cookies para mejorar tu experiencia y mantener funciones esenciales.',
      accept: 'Aceptar',
      reject: 'Rechazar',
      policy: 'Política de privacidad',
      essential: 'Esenciales',
    };
  }, [lang]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1100] p-3 sm:p-4">
      <div className="max-w-5xl mx-auto">
        <Card hover={false} className="border-white/10 bg-gray-950/25 rounded-2xl p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-white font-semibold">{copy.title}</div>
                <Badge variant="info">{copy.essential}</Badge>
              </div>
              <div className="text-sm text-gray-300/90 mt-1">{copy.text}</div>
              <div className="text-xs text-gray-400 mt-2">
                <Link href="/privacidad" className="underline hover:text-gray-200">
                  {copy.policy}
                </Link>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  setCookie('cookie_consent', 'rejected', 60 * 60 * 24 * 180);
                  window.dispatchEvent(new Event('cookie-consent-updated'));
                  setVisible(false);
                }}
                className="whitespace-nowrap"
              >
                <span>{copy.reject}</span>
              </Button>
              <Button
                onClick={() => {
                  setCookie('cookie_consent', 'accepted', 60 * 60 * 24 * 180);
                  window.dispatchEvent(new Event('cookie-consent-updated'));
                  setVisible(false);
                }}
                className="whitespace-nowrap"
              >
                <span>{copy.accept}</span>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
