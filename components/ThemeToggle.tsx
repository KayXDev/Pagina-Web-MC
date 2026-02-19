'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';

type Theme = 'light' | 'dark';

function getPreferredTheme(): Theme {
  try {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }

  return 'dark';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');

  try {
    localStorage.setItem('theme', theme);
  } catch {
    // ignore
  }
}

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const initial = getPreferredTheme();
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const nextTheme = useMemo<Theme>(() => (theme === 'dark' ? 'light' : 'dark'), [theme]);

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="h-10 w-10 inline-flex items-center justify-center leading-none rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      />
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => {
        setTheme(nextTheme);
        applyTheme(nextTheme);
      }}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      className="h-10 w-10 inline-flex items-center justify-center leading-none rounded-md text-gray-300 hover:text-minecraft-grass hover:bg-white/10 transition-colors"
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.94, rotate: theme === 'dark' ? -10 : 10 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.8 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="inline-flex"
        >
          {theme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
