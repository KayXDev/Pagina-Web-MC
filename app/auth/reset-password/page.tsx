'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FaLock, FaArrowLeft } from 'react-icons/fa';
import { Card, Input, Button } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function ResetPasswordPage() {
  const lang = useClientLang();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = String(searchParams?.get('token') || '').trim();

  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error(t(lang, 'auth.reset.missingToken'));
      return;
    }

    if (password.length < 6) {
      toast.error(t(lang, 'auth.reset.passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t(lang, 'auth.register.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String((data as any)?.error || t(lang, 'auth.reset.error')));
      }

      toast.success(t(lang, 'auth.reset.success'));
      router.push('/auth/login');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || t(lang, 'auth.reset.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t(lang, 'auth.reset.title')}</h1>
          <p className="text-gray-400">{t(lang, 'auth.reset.subtitle')}</p>
        </div>

        <Card>
          {!token ? (
            <div className="space-y-4">
              <p className="text-gray-300 text-sm">{t(lang, 'auth.reset.invalidLink')}</p>
              <Link href="/auth/forgot-password" className="text-minecraft-grass hover:text-minecraft-grass/80 font-medium">
                {t(lang, 'auth.reset.requestNew')}
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'auth.fields.password')}</label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">{t(lang, 'auth.fields.confirmPassword')}</label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t(lang, 'auth.reset.loading') : t(lang, 'auth.reset.submit')}
              </Button>
            </form>
          )}

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
