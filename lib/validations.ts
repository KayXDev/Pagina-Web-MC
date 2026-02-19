import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'El nombre de usuario debe tener al menos 3 caracteres')
    .max(20, 'El nombre de usuario no puede exceder 20 caracteres')
    .regex(/^[a-zA-Z0-9_]+$/, 'El nombre de usuario solo puede contener letras, números y guiones bajos'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const ticketSchema = z.object({
  subject: z.string().min(5, 'El asunto debe tener al menos 5 caracteres'),
  category: z.enum(['TECHNICAL', 'BILLING', 'BAN_APPEAL', 'REPORT', 'OTHER']),
  message: z.string().min(20, 'El mensaje debe tener al menos 20 caracteres'),
});

export const productSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  description: z.string().min(10, 'La descripción debe tener al menos 10 caracteres'),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  category: z.enum(['RANK', 'BUNDLES', 'CURRENCY', 'KEYS', 'SPECIAL']),
  features: z.array(z.string()),
  image: z.string().optional(),
  stock: z.number().optional(),
  isUnlimited: z.boolean(),
  isActive: z.boolean(),
});

export const blogPostSchema = z.object({
  title: z.string().min(5, 'El título debe tener al menos 5 caracteres'),
  content: z.string().min(50, 'El contenido debe tener al menos 50 caracteres'),
  excerpt: z.string().min(10, 'El extracto debe tener al menos 10 caracteres').max(200, 'El extracto no puede exceder 200 caracteres'),
  image: z.string().optional(),
  tags: z.array(z.string()),
  isPublished: z.boolean(),
});
