'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaEnvelope, FaArrowLeft } from 'react-icons/fa';
import { Card, Input, Button } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function ForgotPasswordPage() {
  const lang = useClientLang();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      toast.success(t(lang, 'auth.forgot.sent'));
    } catch {
      // Intentionally generic
      toast.success(t(lang, 'auth.forgot.sent'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t(lang, 'auth.forgot.title')}</h1>
          <p className="text-gray-400">{t(lang, 'auth.forgot.subtitle')}</p>
        </div>

        <Card>
          <form onSubmit={submit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'auth.fields.email')}</label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="email"
                  placeholder={t(lang, 'auth.fields.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">{t(lang, 'auth.forgot.hint')}</p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t(lang, 'auth.forgot.loading') : t(lang, 'auth.forgot.submit')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="inline-flex items-center justify-center gap-2 text-gray-300 hover:text-white transition-colors">
              <FaArrowLeft />
              <span>{t(lang, 'auth.forgot.backToLogin')}</span>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
