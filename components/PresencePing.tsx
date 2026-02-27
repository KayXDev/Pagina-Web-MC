'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export default function PresencePing() {
  const { status } = useSession();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (status !== 'authenticated') return;

    const ping = async () => {
      try {
        await fetch('/api/presence/ping', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
          cache: 'no-store',
        });
      } catch {
        // ignore
      }
    };

    // Initial ping + periodic ping
    ping();
    const interval = window.setInterval(ping, 60_000);
    timerRef.current = interval as any;

    const onVis = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [status]);

  return null;
}
