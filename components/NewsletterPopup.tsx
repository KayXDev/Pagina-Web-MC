'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { t, type Lang } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';
import { FaEnvelope, FaTimes, FaCheckCircle, FaBolt, FaGift, FaGlobe, FaCheck } from 'react-icons/fa';

const SEEN_KEY = 'newsletter_popup_seen_v1';
const SUBSCRIBED_KEY = 'newsletter_popup_subscribed_v1';

export default function NewsletterPopup() {
  const lang = useClientLang();

  const [newsletterLang, setNewsletterLang] = useState<Lang>('es');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const seen = window.localStorage.getItem(SEEN_KEY) === 'true';
    const subscribed = window.localStorage.getItem(SUBSCRIBED_KEY) === 'true';
    if (seen || subscribed) return;

    const tId = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(tId);
  }, []);

  useEffect(() => {
    // Default to Spanish as requested (site default is ES), but let the user override.
    setNewsletterLang('es');
  }, []);

  useEffect(() => {
    if (!langMenuOpen) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = langMenuRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setLangMenuOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLangMenuOpen(false);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [langMenuOpen]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SEEN_KEY, 'true');
    }
    setOpen(false);
  };

  const subscribe = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setDone(false);

    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'popup', lang: newsletterLang }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(String((data as any)?.error || t(lang, 'footer.newsletter.error')));

      setDone(true);
      setEmail('');

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(SUBSCRIBED_KEY, 'true');
        window.localStorage.setItem(SEEN_KEY, 'true');
      }

      window.setTimeout(() => setOpen(false), 900);
    } catch (e: any) {
      setError(e?.message || t(lang, 'footer.newsletter.error'));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
        role="presentation"
      />

      <Card
        hover={false}
        className="relative w-full max-w-2xl p-0 overflow-hidden border border-gray-200 bg-white dark:border-white/10 dark:bg-gray-950/70"
      >
        <div className="px-5 py-4 border-b border-gray-200/80 bg-gradient-to-r from-minecraft-grass/15 to-minecraft-diamond/10 dark:border-white/10 dark:from-minecraft-grass/10 dark:to-minecraft-diamond/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-xl bg-white/70 border border-gray-200 grid place-items-center text-gray-900 dark:bg-white/5 dark:border-white/10 dark:text-white">
                <FaEnvelope />
              </div>
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white truncate">
                  {t(lang, 'footer.newsletter.title')}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  {t(lang, 'footer.newsletter.subtitle')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div ref={langMenuRef} className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => setLangMenuOpen((v) => !v)}
                  aria-label={lang === 'es' ? 'Idioma de la newsletter' : 'Newsletter language'}
                  aria-haspopup="menu"
                  aria-expanded={langMenuOpen}
                  className="group relative h-10 w-10 inline-flex items-center justify-center leading-none rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,border-color,transform] duration-200 hover:scale-[1.08] hover:-translate-y-0.5"
                >
                  <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-minecraft-grass/10 to-minecraft-diamond/10" />
                  <FaGlobe aria-hidden="true" size={18} className="relative transition-transform duration-200 group-hover:rotate-12" />
                </button>

                {langMenuOpen && (
                  <div
                    role="menu"
                    aria-label={lang === 'es' ? 'Idioma de la newsletter' : 'Newsletter language'}
                    className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-200 dark:bg-black/95 dark:border-minecraft-grass/20 rounded-md overflow-hidden shadow-lg"
                  >
                    <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-minecraft-grass/10">
                      {lang === 'es' ? 'Idioma de la newsletter' : 'Newsletter language'}
                    </div>
                    <div className="py-1">
                      {([
                        { value: 'es' as const, label: 'Español' },
                        { value: 'en' as const, label: 'English' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setNewsletterLang(opt.value);
                            setLangMenuOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10 flex items-center justify-between"
                        >
                          <span>{opt.label}</span>
                          {newsletterLang === opt.value ? <FaCheck className="text-minecraft-grass" aria-hidden="true" /> : <span className="w-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-gray-700 hover:bg-black/5 dark:text-gray-200 dark:hover:bg-white/10"
                aria-label={t(lang, 'common.close')}
                title={t(lang, 'common.close')}
              >
                <FaTimes />
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="text-sm text-gray-700 dark:text-gray-200">
            {lang === 'es'
              ? 'Recibe un resumen semanal con novedades, eventos y cambios importantes del servidor.'
              : 'Get a weekly summary with news, events, and important server updates.'}
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
              <div className="flex items-center gap-2 font-bold">
                <FaBolt className="text-minecraft-diamond" />
                <span>{lang === 'es' ? 'Novedades' : 'Updates'}</span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Lo último del servidor y la web.' : 'Latest server & site news.'}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
              <div className="flex items-center gap-2 font-bold">
                <FaGift className="text-minecraft-grass" />
                <span>{lang === 'es' ? 'Eventos' : 'Events'}</span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Fechas, premios y avisos.' : 'Dates, rewards, and notices.'}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm text-gray-800 dark:border-white/10 dark:bg-white/5 dark:text-gray-200">
              <div className="flex items-center gap-2 font-bold">
                <FaCheckCircle className="text-minecraft-grass" />
                <span>{lang === 'es' ? 'Sin spam' : 'No spam'}</span>
              </div>
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                {lang === 'es' ? 'Baja con 1 clic.' : 'Unsubscribe with 1 click.'}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t(lang, 'footer.newsletter.placeholder')}
              disabled={loading}
            />
            <Button type="button" onClick={subscribe} disabled={loading || !email.trim()}>
              {loading ? t(lang, 'footer.newsletter.loading') : t(lang, 'footer.newsletter.submit')}
            </Button>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {lang === 'es'
                ? 'Te enviaremos como máximo 1 email por semana. Puedes darte de baja cuando quieras.'
                : 'We will send at most 1 email per week. Unsubscribe anytime.'}
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={close} disabled={loading}>
              {lang === 'es' ? 'Ahora no' : 'Not now'}
            </Button>
          </div>

          {done ? (
            <div className="mt-3 text-xs text-green-700 dark:text-green-400">{t(lang, 'footer.newsletter.success')}</div>
          ) : null}
          {error ? (
            <div className="mt-3 text-xs text-red-700 dark:text-red-400">{error}</div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
