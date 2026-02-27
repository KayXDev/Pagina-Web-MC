'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import type { InputHTMLAttributes } from 'react';

interface CardProps {
  children?: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export const Card = ({ children, className = '', hover = true, onClick }: CardProps) => {
  return (
    <motion.div
      whileHover={hover ? { y: -5, transition: { duration: 0.2 } } : {}}
      onClick={onClick}
      className={`relative rounded-2xl p-6 bg-white/90 border border-gray-200/80 text-gray-900 shadow-sm shadow-black/5 ring-1 ring-black/5 transition-shadow hover:shadow-md hover:shadow-black/10 dark:bg-brand-surface/55 dark:border-white/10 dark:text-gray-100 dark:shadow-black/40 dark:ring-white/10 dark:hover:border-brand-accent/30 dark:hover:shadow-brand-accent/10 ${className}`}
    >
      {children}
    </motion.div>
  );
};

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  disabled = false,
}: ButtonProps) => {
  const baseStyles =
    'font-semibold rounded-xl transition-all duration-200 inline-flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-brand-bg';
  
  const variants = {
    primary:
      'text-white bg-gradient-to-r from-brand-primary via-brand-neon to-brand-accent bg-[length:200%_200%] bg-[position:0%_50%] hover:bg-[position:100%_50%] transition-[background-position] duration-700 shadow-lg shadow-brand-accent/20 hover:shadow-brand-neon/30 ring-1 ring-white/10',
    secondary:
      'bg-white/80 text-gray-900 hover:bg-white border border-gray-200/80 shadow-sm shadow-black/5 dark:bg-white/5 dark:text-gray-100 dark:border-white/10 dark:hover:bg-white/10 dark:hover:border-brand-accent/20',
    danger: 'bg-red-600 text-white hover:bg-red-700 ring-1 ring-white/10',
    success: 'bg-green-600 text-white hover:bg-green-700 ring-1 ring-white/10',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </motion.button>
  );
};

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className = '' }: BadgeProps) => {
  const variants = {
    default: 'bg-gray-200/80 text-gray-800 border border-black/5 dark:bg-white/10 dark:text-gray-200 dark:border-white/10',
    success: 'bg-green-600/15 text-green-700 border border-green-600/20 dark:bg-green-600/20 dark:text-green-400 dark:border-green-400/20',
    warning: 'bg-yellow-600/15 text-yellow-900 border border-yellow-600/20 dark:bg-yellow-600/20 dark:text-yellow-400 dark:border-yellow-400/20',
    danger: 'bg-red-600/15 text-red-700 border border-red-600/20 dark:bg-red-600/20 dark:text-red-400 dark:border-red-400/20',
    info: 'bg-blue-600/15 text-blue-700 border border-blue-600/20 dark:bg-brand-accent/15 dark:text-brand-accent dark:border-brand-accent/20',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export const Input = ({ className = '', disabled = false, ...props }: InputProps) => {
  return (
    <input
      disabled={disabled}
      {...props}
      className={`w-full px-4 py-2.5 bg-white/90 border border-gray-300/80 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-accent/70 focus:border-transparent transition-all duration-200 dark:bg-brand-surface/35 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-400 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    />
  );
};

interface TextareaProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  minLength?: number;
  maxLength?: number;
}

export const Textarea = ({
  placeholder,
  value,
  onChange,
  className = '',
  rows = 4,
  required = false,
  disabled = false,
  name,
  minLength,
  maxLength,
}: TextareaProps) => {
  return (
    <textarea
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      name={name}
      rows={rows}
      required={required}
      disabled={disabled}
      minLength={minLength}
      maxLength={maxLength}
      className={`w-full px-4 py-2.5 bg-white/90 border border-gray-300/80 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-accent/70 focus:border-transparent transition-all duration-200 resize-none dark:bg-brand-surface/35 dark:border-white/10 dark:text-gray-100 dark:placeholder-gray-400 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    />
  );
};

interface SelectProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  children: ReactNode;
}

export const Select = ({
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
  name,
  children,
}: SelectProps) => {
  return (
    <select
      value={value}
      onChange={onChange}
      name={name}
      required={required}
      disabled={disabled}
      className={`w-full px-4 py-2.5 bg-white/90 border border-gray-300/80 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-accent/70 focus:border-transparent transition-all duration-200 dark:bg-brand-surface/35 dark:border-white/10 dark:text-gray-100 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      } ${className}`}
    >
      {children}
    </select>
  );
};
