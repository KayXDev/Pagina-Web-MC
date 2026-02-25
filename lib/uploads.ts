import path from 'path';
import { promises as fs } from 'fs';
import { put } from '@vercel/blob';

import { isCloudinaryEnabled, uploadImageBuffer } from '@/lib/cloudinary';

const MAX_BYTES_DEFAULT = 5 * 1024 * 1024; // 5MB
const DEFAULT_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

function safeExtFromType(mime: string) {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return '';
}

function randomId() {
  return Math.random().toString(16).slice(2);
}

export type UploadImageOpts = {
  file: File;
  folder: string;
  prefix: string;
  maxBytes?: number;
  allowedTypes?: Set<string>;
};

export class UploadError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'UploadError';
    this.status = status;
  }
}

export async function uploadImageFromFormFile(opts: UploadImageOpts): Promise<{ url: string }> {
  const maxBytes = opts.maxBytes ?? MAX_BYTES_DEFAULT;
  const allowedTypes = opts.allowedTypes ?? DEFAULT_ALLOWED_TYPES;

  if (!allowedTypes.has(opts.file.type)) {
    throw new UploadError('Tipo de imagen no permitido', 400);
  }

  if (opts.file.size > maxBytes) {
    throw new UploadError(`La imagen excede ${Math.round(maxBytes / (1024 * 1024))}MB`, 400);
  }

  const ext = safeExtFromType(opts.file.type);
  if (!ext) {
    throw new UploadError('Tipo de imagen inválido', 400);
  }

  const bytes = await opts.file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Option 1: Cloudinary (if configured)
  if (isCloudinaryEnabled()) {
    const uploaded = await uploadImageBuffer({
      buffer,
      folder: opts.folder,
      publicId: `${opts.prefix}_${Date.now()}_${randomId()}`,
    });
    return { url: uploaded.url };
  }

  // Option 2: Vercel Blob (recommended for Vercel)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const filename = `${opts.folder}/${opts.prefix}_${Date.now()}_${randomId()}.${ext}`;
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: opts.file.type,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return { url: blob.url };
  }

  if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
    throw new UploadError(
      'Uploads en producción requieren configurar Vercel Blob (BLOB_READ_WRITE_TOKEN) o Cloudinary. El filesystem del servidor es efímero y no persistirá entre despliegues.',
      500
    );
  }

  // Option 3: Local filesystem fallback (dev/self-hosted only)
  const dir = path.join(process.cwd(), 'public', 'uploads', ...opts.folder.split('/'));
  await fs.mkdir(dir, { recursive: true });

  const filename = `${opts.prefix}_${Date.now()}_${randomId()}.${ext}`;
  const fullPath = path.join(dir, filename);
  await fs.writeFile(fullPath, buffer);

  return { url: `/uploads/${opts.folder}/${filename}` };
}
