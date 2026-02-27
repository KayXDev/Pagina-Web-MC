'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import { LangProvider } from '@/lib/lang-context';
import type { Lang } from '@/lib/i18n';
import PresencePing from '@/components/PresencePing';

export function Providers({ children, initialLang }: { children: ReactNode; initialLang: Lang }) {
  return (
    <SessionProvider>
      <LangProvider initialLang={initialLang}>{children}</LangProvider>
      <PresencePing />
    </SessionProvider>
  );
}
