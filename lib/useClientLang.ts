'use client';

import { useEffect, useState } from 'react';
import { getClientLangFromCookie, type Lang } from '@/lib/i18n';
import { useLangContext } from '@/lib/lang-context';

/**
 * Client-side language state derived from the `lang` cookie.
 *
 * Components using this hook will update when `window` dispatches `langchange`.
 */
export function useClientLang(): Lang {
  const ctx = useLangContext();
  const hasProvider = !!ctx;
  const [lang, setLang] = useState<Lang>('es');

  useEffect(() => {
    if (hasProvider) return;

    const sync = () => setLang(getClientLangFromCookie());
    sync();
    window.addEventListener('langchange', sync);
    return () => window.removeEventListener('langchange', sync);
  }, [hasProvider]);

  return hasProvider ? ctx!.lang : lang;
}
