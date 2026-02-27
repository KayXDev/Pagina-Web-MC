'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, Button, Input } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function VerifyEmailPage() {
  const lang = useClientLang();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const e = email.trim().toLowerCase();
    const c = code.trim();
    if (!e || !c) {
      toast.error(t(lang, 'auth.verifyEmail.error'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, code: c }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || t(lang, 'auth.verifyEmail.error'));
      toast.success(t(lang, 'auth.verifyEmail.success'));
    } catch (err: any) {
      toast.error(err?.message || t(lang, 'auth.verifyEmail.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t(lang, 'auth.verifyEmail.title')}</h1>
          <p className="text-gray-400">{t(lang, 'auth.verifyEmail.subtitle')}</p>
        </div>

        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'auth.fields.email')}</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t(lang, 'auth.fields.emailPlaceholder')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'auth.register.codeLabel')}</label>
              <Input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t(lang, 'auth.register.codePlaceholder')}
                className="tracking-[0.4em] text-center"
              />
            </div>
            <Button className="w-full" disabled={loading} onClick={submit}>
              {loading ? t(lang, 'auth.register.verifying') : t(lang, 'auth.register.verifyCode')}
            </Button>
            <Link href="/auth/login" className="block">
              <Button variant="secondary" className="w-full">{t(lang, 'auth.verifyEmail.goLogin')}</Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
