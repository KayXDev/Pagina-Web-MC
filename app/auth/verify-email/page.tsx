'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, Button } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function VerifyEmailPage() {
  const lang = useClientLang();
  const searchParams = useSearchParams();
  const token = useMemo(() => String(searchParams?.get('token') || '').trim(), [searchParams]);

  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      if (!token) {
        setLoading(false);
        setOk(false);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as any).error || 'Error');
        setOk(true);
        toast.success(t(lang, 'auth.verifyEmail.success'));
      } catch (err: any) {
        setOk(false);
        toast.error(err?.message || t(lang, 'auth.verifyEmail.error'));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, lang]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t(lang, 'auth.verifyEmail.title')}</h1>
          <p className="text-gray-400">{t(lang, 'auth.verifyEmail.subtitle')}</p>
        </div>

        <Card>
          {loading ? (
            <div className="text-gray-300">{t(lang, 'common.loading')}</div>
          ) : ok ? (
            <div className="space-y-4">
              <div className="text-gray-200">{t(lang, 'auth.verifyEmail.done')}</div>
              <Link href="/auth/login" className="block">
                <Button className="w-full">{t(lang, 'auth.verifyEmail.goLogin')}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-gray-200">{t(lang, 'auth.verifyEmail.failed')}</div>
              <Link href="/auth/login" className="block">
                <Button variant="secondary" className="w-full">{t(lang, 'auth.verifyEmail.goLogin')}</Button>
              </Link>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
