'use client';

import { Button } from '@/components/ui';

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const attrs = [`Path=/`, 'Max-Age=0', 'SameSite=Lax', secure ? 'Secure' : ''].filter(Boolean).join('; ');
  document.cookie = `${name}=; ${attrs}`;
}

export default function CookiePreferencesButton() {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        deleteCookie('cookie_consent');
        window.dispatchEvent(new Event('cookie-consent-updated'));
      }}
    >
      Cambiar preferencias de cookies
    </Button>
  );
}
