'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaEnvelope, FaLock, FaSignInAlt } from 'react-icons/fa';
import { Input, Button, Card } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lang = useClientLang();
  const [loading, setLoading] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const callbackUrl = searchParams?.get('callbackUrl') || '/';

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setShowResendVerification(
          String(result.error || '').toLowerCase().includes('verificar') ||
            String(result.error || '').toLowerCase().includes('verify')
        );
      } else {
        setShowResendVerification(false);
        toast.success(t(lang, 'auth.login.success'));
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      toast.error(t(lang, 'auth.login.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{t(lang, 'auth.login.title')}</h1>
          <p className="text-gray-400">{t(lang, 'auth.login.subtitle')}</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t(lang, 'auth.fields.email')}
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="email"
                  placeholder={t(lang, 'auth.fields.emailPlaceholder')}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t(lang, 'auth.fields.password')}
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
              <div className="mt-2 text-right">
                <Link href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-white transition-colors">
                  {t(lang, 'auth.login.forgot')}
                </Link>
              </div>
              {showResendVerification ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-500">{t(lang, 'auth.login.resendVerifyHint')}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/resend-verification', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: formData.email }),
                        });
                        toast.success(t(lang, 'auth.login.resendVerifySent'));
                      } catch {
                        toast.success(t(lang, 'auth.login.resendVerifySent'));
                      }
                    }}
                    className="text-xs text-brand-accent hover:text-brand-accent/80 font-medium"
                  >
                    {t(lang, 'auth.login.resendVerify')}
                  </button>
                </div>
              ) : null}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span>{t(lang, 'auth.login.loading')}</span>
              ) : (
                <>
                  <FaSignInAlt />
                  <span>{t(lang, 'auth.login.submit')}</span>
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {t(lang, 'auth.login.noAccount')}{' '}
              <Link href="/auth/register" className="text-brand-accent hover:text-brand-accent/80 font-medium">
                {t(lang, 'auth.login.registerLink')}
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
