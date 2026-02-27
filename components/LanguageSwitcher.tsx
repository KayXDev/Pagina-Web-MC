'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheck, FaGlobe } from 'react-icons/fa';
import { normalizeLang, type Lang, t } from '@/lib/i18n';
import { useClientLang } from '@/lib/useClientLang';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const router = useRouter();
  const lang = useClientLang();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const setCookie = (next: Lang) => {
    document.cookie = `lang=${encodeURIComponent(next)}; path=/; max-age=${60 * 60 * 24 * 365}`;
  };

  const options = useMemo(
    () => [
      { value: 'es' as const, label: t(lang, 'lang.es') },
      { value: 'en' as const, label: t(lang, 'lang.en') },
    ],
    [lang]
  );

  const applyLang = (nextRaw: string) => {
    const next = normalizeLang(nextRaw);
    setCookie(next);
    setOpen(false);

    try {
      document.documentElement.lang = next;
    } catch {
      // ignore
    }

    try {
      window.dispatchEvent(new Event('langchange'));
    } catch {
      // ignore
    }

    router.refresh();
  };

  return (
    <div ref={rootRef} className={`relative flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t(lang, 'lang.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="group relative h-10 w-10 inline-flex items-center justify-center leading-none rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-[color,background-color,border-color,transform] duration-200 hover:scale-[1.08] hover:-translate-y-0.5"
      >
        <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-brand-neon/10 to-brand-accent/10" />
        <FaGlobe aria-hidden="true" size={18} className="relative transition-transform duration-200 group-hover:rotate-12" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t(lang, 'lang.label')}
          className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 dark:bg-brand-surface/85 dark:border-white/10 rounded-md overflow-hidden shadow-lg"
        >
          <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-white/10">
            {t(lang, 'lang.label')}
          </div>
          <div className="py-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="menuitem"
                onClick={() => applyLang(opt.value)}
                className="w-full text-left px-3 py-2 text-sm text-gray-900 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10 flex items-center justify-between"
              >
                <span>{opt.label}</span>
                {lang === opt.value ? <FaCheck className="text-brand-accent" aria-hidden="true" /> : <span className="w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
