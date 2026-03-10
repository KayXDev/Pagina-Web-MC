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
      className="mx-auto mb-10 max-w-4xl text-center sm:mb-12"
    >
      {icon && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="mb-4 flex justify-center sm:mb-5"
        >
          <div className="grid place-items-center rounded-[28px] border border-white/10 bg-slate-950/75 p-4 shadow-[0_28px_70px_-44px_rgba(0,0,0,0.6)] dark:border-white/10 dark:bg-white/5">
            {icon}
          </div>
        </motion.div>
      )}
      <h1 className="mb-3 text-3xl font-bold tracking-[-0.05em] sm:text-4xl md:text-5xl">
        <span className="block text-transparent bg-clip-text bg-gradient-to-r from-gray-950 via-gray-800 to-gray-950 dark:from-minecraft-grass dark:via-minecraft-diamond dark:to-minecraft-grass">
          {title}
        </span>
      </h1>
      {description && (
        <p className="mx-auto max-w-2xl text-base leading-7 text-gray-700 dark:text-gray-300/90 sm:text-lg">{description}</p>
      )}
    </motion.div>
  );
};

export default PageHeader;
