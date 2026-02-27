'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
}

const PageHeader = ({ title, description, icon }: PageHeaderProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center mb-12"
    >
      {icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-5"
        >
          <div className="h-20 w-20 rounded-2xl grid place-items-center bg-white/80 border border-gray-200/70 shadow-sm shadow-black/5 ring-1 ring-black/5 dark:bg-brand-surface/45 dark:border-white/10 dark:ring-white/10 dark:shadow-black/40">
            {icon}
          </div>
        </motion.div>
      )}
      <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gray-950 via-gray-800 to-gray-950 dark:from-brand-neon dark:via-brand-accent dark:to-brand-electric">
          {title}
        </span>
      </h1>
      {description && (
        <p className="text-gray-700 dark:text-gray-300/90 text-lg max-w-3xl mx-auto leading-relaxed">{description}</p>
      )}
    </motion.div>
  );
};

export default PageHeader;
