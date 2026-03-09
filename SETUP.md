<p align="center">
	<img src="public/icon.png" alt="999Wrld Network" width="88" height="88" />
</p>

<h1 align="center">Setup Guide</h1>

<p align="center">
	Complete setup guide for local development, production deployment, environment variables,
	uploads, email, payments, cron jobs and the required KayX license flow.
</p>

<p align="center">
	<a href="README.md"><strong>README</strong></a>
	·
	<a href="docs/license-system.md"><strong>License Docs</strong></a>
	·
	<a href="TROUBLESHOOTING.md"><strong>Troubleshooting</strong></a>
	·
	<a href="CHANGELOG.md"><strong>Changelog</strong></a>
</p>

<p align="center">
	<img alt="Local setup" src="https://img.shields.io/badge/Setup-Local%20%2B%20Production-2563eb" />
	<img alt="MongoDB" src="https://img.shields.io/badge/Database-MongoDB-16a34a" />
	<img alt="License" src="https://img.shields.io/badge/License-KayX%20Required-dc2626" />
	<img alt="Deploy" src="https://img.shields.io/badge/Deploy-Vercel-black" />
</p>

---

## 🧭 Table of Contents

- [✅ Before you start](#-before-you-start)
- [🚀 Local quickstart](#-local-quickstart)
- [🔧 Core environment variables](#-core-environment-variables)
- [📦 Feature-specific variables](#-feature-specific-variables)
- [🌍 Production deployment](#-production-deployment)
- [🖼️ Uploads](#️-uploads)
- [✉️ Email](#️-email)
- [💳 Payments](#-payments)
- [🕒 Cron and automation](#-cron-and-automation)
- [🗺️ SEO and verification](#️-seo-and-verification)
- [🧪 Recommended validation checklist](#-recommended-validation-checklist)
- [📜 Useful commands](#-useful-commands)

---

## ✅ Before you start

Make sure you already have:

- Node.js **18.17+** (Node 20+ recommended)
- npm
- MongoDB Atlas or another reachable MongoDB instance
- A valid **KayX License** configuration

Recommended production services:

- **MongoDB Atlas**
- **Vercel**
- **Vercel Blob** or **Cloudinary** for uploads

---

## 🚀 Local quickstart

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env`

```bash
cp .env.example .env
```

### 3) Generate `NEXTAUTH_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 4) Fill the minimum required values

At minimum, configure:

```env
MONGODB_URI=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
KAYX_LICENSE_KEY=
KAYX_PRODUCT_ID=minecraft-server-web
KAYX_LICENSE_API_URL=
KAYX_API_TOKEN=
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change-me
```

### 5) Initialize the database

```bash
npm run init-db
```

This seeds the initial admin using `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

### 6) Start development

```bash
npm run dev
```

Open: `http://localhost:3000`

> [!IMPORTANT]
> The app validates the license before development startup finishes.
> If the license is invalid or incomplete, the site will not boot.

---

## 🔧 Core environment variables

The full reference lives in `.env.example`. These are the ones you will use first.

| Variable | Required | Purpose |
|---|:---:|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `NEXTAUTH_URL` | ✅ | Base URL for auth callbacks |
| `NEXTAUTH_SECRET` | ✅ | Secret for NextAuth sessions/JWT |
| `ADMIN_EMAIL` | ✅ | Initial seeded admin email |
| `ADMIN_PASSWORD` | ✅ | Initial seeded admin password |
| `KAYX_LICENSE_KEY` | ✅ | Buyer license key |
| `KAYX_PRODUCT_ID` | ✅ | Exact product name/ID from the license panel |
| `KAYX_LICENSE_API_URL` | ✅ | REST endpoint used for validation |
| `KAYX_API_TOKEN` | ✅ | API token used in license requests |
| `SITE_NAME` | Recommended | Brand name across SEO and emails |
| `SITE_URL` | Recommended | Final site URL for SEO, links and emails |

### License-related optional variables

| Variable | Purpose |
|---|---|
| `KAYX_SHARED_SECRET` | Extra shared secret if your license API expects one |
| `LICENSE_FAIL_OPEN` | Let runtime continue temporarily if the license API is down |
| `LICENSE_CACHE_TTL_MS` | Cache duration for runtime validation |

---

## 📦 Feature-specific variables

### Minecraft widgets / linking

- `MINECRAFT_SERVER_IP`
- `MINECRAFT_SERVER_PORT`
- `MC_ONLINE_MODE`
- `RCON_HOST`
- `RCON_PORT`
- `RCON_PASSWORD`

### Public client-side variables

- `NEXT_PUBLIC_MINECRAFT_SERVER_IP`
- `NEXT_PUBLIC_MINECRAFT_SERVER_PORT`
- `NEXT_PUBLIC_DISCORD_URL`
- `NEXT_PUBLIC_TIKTOK_URL`
- `NEXT_PUBLIC_YOUTUBE_URL`
- `NEXT_PUBLIC_STAFF_APPLICATIONS_OPEN`

### Uploads

- `BLOB_READ_WRITE_TOKEN`
- `CLOUDINARY_URL`
- or `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

### Email

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### Payments

PayPal:

- `PAYPAL_ENV`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

Stripe:

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

### Cron / automation

- `CRON_SECRET`

### AI features

- `GROQ_API_KEY`
- `GROQ_MODEL`
- `TICKETS_AI_ENABLED`
- `TICKETS_AI_PROVIDER`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

---

## 🌍 Production deployment

Recommended target: **Vercel**

### Deployment checklist

1. Add all required environment variables in your hosting provider.
2. Set `NEXTAUTH_URL` and `SITE_URL` to the real domain.
3. Ensure MongoDB Atlas allows the deployment environment.
4. Configure a persistent upload provider.
5. Make sure the KayX license API is reachable from production.
6. Redeploy after any environment-variable change.

### Vercel notes

- `npm run build` is used for the build.
- `npm start` runs through `scripts/start.mjs`, so the production server validates the license before booting.
- Local filesystem uploads are not safe on Vercel because the filesystem is ephemeral.
- Preview and Production environments may have different env values, so verify both when debugging.

### Self-hosted notes

- Local filesystem uploads can work if storage is persistent.
- If the website and the license API are on different machines, do **not** use `localhost` for the license endpoint.
- Check firewall, reverse proxy, port exposure, and TLS if production cannot reach the license service.

---

## 🖼️ Uploads

The upload helper works in this order:

1. **Cloudinary** if configured
2. **Vercel Blob** if `BLOB_READ_WRITE_TOKEN` is present
3. **Local filesystem** fallback in development/self-hosted environments

### Recommended production setups

**Vercel Blob**

```env
BLOB_READ_WRITE_TOKEN=
```

**Cloudinary**

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Or the three-variable version:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## ✉️ Email

To enable password reset and newsletter delivery, configure SMTP:

```env
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=999Wrld Network <no-reply@yourdomain.com>
```

Without SMTP:

- Password reset emails will not send
- Newsletter sending will be skipped/fail depending on the flow

---

## 💳 Payments

Configure these only if you use the store checkout.

### PayPal

```env
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

### Stripe

```env
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

Use matching test/live credentials to avoid broken checkout behavior.

---

## 🕒 Cron and automation

Important endpoint:

- `/api/cron/newsletter-weekly`

Authorization supports:

- `User-Agent: vercel-cron/1.0`
- `x-cron-secret`
- `?secret=` when `CRON_SECRET` is configured

Example manual test:

```bash
curl -i "https://YOUR_DOMAIN/api/cron/newsletter-weekly?secret=YOUR_CRON_SECRET"
```

---

## 🗺️ SEO and verification

For production SEO, configure:

- `SITE_URL`
- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`

The app includes:

- `GET /sitemap.xml`
- `GET /robots.txt`
- canonical metadata
- OpenGraph / Twitter metadata
- JSON-LD for site and content pages

---

## 🧪 Recommended validation checklist

Before considering setup complete, verify:

1. The app starts with `npm run dev`
2. Login works
3. Admin access works
4. License validation works
5. Uploads work with the configured provider
6. Password reset emails send correctly
7. Payments use the correct environment
8. `sitemap.xml` and `robots.txt` respond correctly

Recommended commands:

```bash
npm run lint
npm run build
```

---

## 📜 Useful commands

- `npm run dev`
- `npm run build`
- `npm start`
- `npm run lint`
- `npm run init-db`
- `npm run deliveries:worker`
- `npm run stats`

If anything fails, continue with **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**.