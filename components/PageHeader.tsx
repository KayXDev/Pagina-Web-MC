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
          className="flex justify-center mb-4"
        >
          {icon}
        </motion.div>
      )}
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 bg-gradient-to-r from-minecraft-grass via-minecraft-diamond to-minecraft-grass bg-clip-text text-transparent">
        {title}
      </h1>
      {description && (
        <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">{description}</p>
      )}
    </motion.div>
  );
};

export default PageHeader;
