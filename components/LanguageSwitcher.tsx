'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheck, FaGlobe } from 'react-icons/fa';
import { getClientLangFromCookie, normalizeLang, type Lang, t } from '@/lib/i18n';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('es');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLang(getClientLangFromCookie());
  }, []);

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
    setLang(next);
    setCookie(next);
    setOpen(false);
    router.refresh();
    window.location.reload();
  };

  return (
    <div ref={rootRef} className={`relative flex items-center ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t(lang, 'lang.label')}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-10 w-10 inline-flex items-center justify-center leading-none rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
      >
        <FaGlobe aria-hidden="true" size={18} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t(lang, 'lang.label')}
          className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-200 dark:bg-black/95 dark:border-minecraft-grass/20 rounded-md overflow-hidden shadow-lg"
        >
          <div className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-minecraft-grass/10">
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
                {lang === opt.value ? <FaCheck className="text-minecraft-grass" aria-hidden="true" /> : <span className="w-4" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
