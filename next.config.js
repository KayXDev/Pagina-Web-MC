/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['*.trycloudflare.com', '*.loca.lt'],
  images: {
    domains: ['localhost', 'crafatar.com'],
  },
}

module.exports = nextConfig
