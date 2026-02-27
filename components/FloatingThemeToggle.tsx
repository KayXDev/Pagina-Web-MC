'use client';

import ThemeToggle from '@/components/ThemeToggle';

export default function FloatingThemeToggle() {
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <ThemeToggle variant="floating" />
    </div>
  );
}
