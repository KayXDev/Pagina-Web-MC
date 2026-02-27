'use client';

import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const parts = String(document.cookie || '').split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (rawKey === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function hasAnalyticsConsent(): boolean {
  return getCookie('cookie_consent') === 'accepted';
}

export default function ConsentAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const sync = () => setEnabled(hasAnalyticsConsent());
    sync();

    window.addEventListener('cookie-consent-updated', sync);
    return () => window.removeEventListener('cookie-consent-updated', sync);
  }, []);

  if (!enabled) return null;
  return <Analytics />;
}
