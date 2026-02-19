import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
  if (configured) return;

  // Supports either CLOUDINARY_URL or the 3 separate vars.
  if (
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
}

export function isCloudinaryEnabled() {
  ensureConfigured();
  return Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );
}

export async function uploadImageBuffer(opts: {
  buffer: Buffer;
  folder: string;
  publicId: string;
}): Promise<{ url: string }> {
  ensureConfigured();

  return await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        folder: opts.folder,
        public_id: opts.publicId,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
        const url = typeof result.secure_url === 'string' ? result.secure_url : '';
        if (!url) return reject(new Error('Cloudinary did not return a URL'));
        resolve({ url });
      }
    );

    stream.end(opts.buffer);
  });
}
