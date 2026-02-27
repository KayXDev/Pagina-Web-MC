'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaUserPlus } from 'react-icons/fa';
import { Input, Button, Card } from '@/components/ui';
import { toast } from 'react-toastify';
import { t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function RegisterPage() {
  const router = useRouter();
  const lang = useClientLang();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'code' | 'done'>('form');
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t(lang, 'auth.register.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || t(lang, 'auth.register.error'));
        return;
      }

      const verificationRequired = Boolean((data as any)?.verificationRequired);
      if (verificationRequired) {
        toast.success(t(lang, 'auth.register.verifySent'));
        setStep('code');
        setCode('');
      } else {
        toast.success(t(lang, 'auth.register.success'));
        setStep('done');
      }
    } catch (error) {
      toast.error(t(lang, 'auth.register.error'));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    const email = formData.email.trim().toLowerCase();
    const c = code.trim();
    if (!email || c.length < 4) {
      toast.error(t(lang, 'auth.verifyEmail.error'));
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: c }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || t(lang, 'auth.verifyEmail.error'));
      toast.success(t(lang, 'auth.register.verifiedDone'));
      setStep('done');
    } catch (err: any) {
      toast.error(err?.message || t(lang, 'auth.verifyEmail.error'));
    } finally {
      setVerifying(false);
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
          <h1 className="text-4xl font-bold text-white mb-2">{t(lang, 'auth.register.title')}</h1>
          <p className="text-gray-400">{t(lang, 'auth.register.subtitle')}</p>
        </div>

        <Card>
          {step === 'form' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t(lang, 'auth.fields.name')}
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="text"
                  placeholder={t(lang, 'auth.fields.namePlaceholder')}
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t(lang, 'auth.fields.username')}
              </label>
              <div className="relative">
                <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="text"
                  placeholder={t(lang, 'auth.fields.usernamePlaceholder')}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t(lang, 'auth.fields.confirmPassword')}
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <span>{t(lang, 'auth.register.loading')}</span>
              ) : (
                <>
                  <FaUserPlus />
                  <span>{t(lang, 'auth.register.submit')}</span>
                </>
              )}
            </Button>
            </form>
          ) : step === 'code' ? (
            <div className="space-y-6">
              <div>
                <div className="text-white font-semibold">{t(lang, 'auth.register.codeTitle')}</div>
                <div className="text-sm text-gray-400 mt-1">{t(lang, 'auth.register.codeSubtitle')}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t(lang, 'auth.register.codeLabel')}
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={t(lang, 'auth.register.codePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="tracking-[0.4em] text-center"
                />
              </div>

              <Button className="w-full" disabled={verifying} onClick={verifyCode}>
                {verifying ? (
                  <span>{t(lang, 'auth.register.verifying')}</span>
                ) : (
                  <span>{t(lang, 'auth.register.verifyCode')}</span>
                )}
              </Button>

              <Button
                variant="secondary"
                className="w-full"
                disabled={verifying}
                onClick={async () => {
                  try {
                    await fetch('/api/auth/resend-verification', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: formData.email }),
                    });
                    toast.success(t(lang, 'auth.register.resendSent'));
                  } catch {
                    toast.success(t(lang, 'auth.register.resendSent'));
                  }
                }}
              >
                <span>{t(lang, 'auth.register.resendCode')}</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-gray-200">{t(lang, 'auth.register.success')}</div>
              <Button
                className="w-full"
                onClick={() => {
                  router.push('/auth/login');
                }}
              >
                <span>{t(lang, 'auth.register.loginLink')}</span>
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              {t(lang, 'auth.register.haveAccount')}{' '}
              <Link href="/auth/login" className="text-brand-accent hover:text-brand-accent/80 font-medium">
                {t(lang, 'auth.register.loginLink')}
              </Link>
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
