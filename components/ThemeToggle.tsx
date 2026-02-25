'use client';

import { motion } from 'framer-motion';
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
        className="h-10 w-10 inline-flex items-center justify-center leading-none rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-white/10 transition-colors"
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
      className="group relative h-10 w-10 inline-flex items-center justify-center leading-none rounded-md text-gray-700 hover:text-minecraft-grass hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 transition-colors"
      whileHover={{ scale: 1.1, y: -1, rotate: theme === 'dark' ? -10 : 10 }}
      transition={{ type: 'spring', stiffness: 520, damping: 28 }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-gradient-to-r from-minecraft-grass/10 to-minecraft-diamond/10" />
      <span className="inline-flex relative">
        {theme === 'dark' ? <FaSun size={18} /> : <FaMoon size={18} />}
      </span>
    </motion.button>
  );
}
