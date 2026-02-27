'use client';

import { Button } from '@/components/ui';
import { useClientLang } from '@/lib/useClientLang';

function deleteCookie(name: string) {
  if (typeof document === 'undefined') return;
  const secure = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const attrs = [`Path=/`, 'Max-Age=0', 'SameSite=Lax', secure ? 'Secure' : ''].filter(Boolean).join('; ');
  document.cookie = `${name}=; ${attrs}`;
}

export default function CookiePreferencesButton() {
  const lang = useClientLang();

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        deleteCookie('cookie_consent');
        window.dispatchEvent(new Event('cookie-consent-updated'));
      }}
    >
      {lang === 'en' ? 'Change cookie preferences' : 'Cambiar preferencias de cookies'}
    </Button>
  );
}
