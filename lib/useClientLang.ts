'use client';

import { useEffect, useState } from 'react';
import { getClientLangFromCookie, type Lang } from '@/lib/i18n';

/**
 * Client-side language state derived from the `lang` cookie.
 *
 * Components using this hook will update when `window` dispatches `langchange`.
 */
export function useClientLang(): Lang {
  const [lang, setLang] = useState<Lang>(() => getClientLangFromCookie());

  useEffect(() => {
    const sync = () => setLang(getClientLangFromCookie());
    window.addEventListener('langchange', sync);
    return () => window.removeEventListener('langchange', sync);
  }, []);

  return lang;
}
