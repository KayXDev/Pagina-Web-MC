# Setup (Local + Production)

Practical, complete guide to run the project locally, initialize MongoDB, configure environment variables, and deploy to production.

---

## Table of Contents

- [1) Requirements](#1-requirements)
- [2) Local quickstart](#2-local-quickstart)
- [3) Production (Vercel)](#3-production-vercel)
- [4) Environment variables](#4-environment-variables)
- [5) Uploads](#5-uploads)
- [6) Email (Forgot password)](#6-email-forgot-password)
- [7) Payments (PayPal/Stripe)](#7-payments-paypalstripe)
- [8) Newsletter + Cron](#8-newsletter--cron)
- [9) SEO + Search Console](#9-seo--search-console)
- [10) Database (Compass)](#10-database-compass)
- [11) Useful commands](#11-useful-commands)

---

## 1) Requirements

- Node.js **18.17+** (Node 20+ recommended)
- npm
- MongoDB (MongoDB Atlas recommended)

---

## 2) Local quickstart

### 2.1 Install dependencies

```bash
npm install
```

### 2.2 Create `.env`

```bash
cp .env.example .env
```

Minimum required:

- `MONGODB_URI`
- `NEXTAUTH_URL=http://localhost:3000`
- `NEXTAUTH_SECRET`

Generate `NEXTAUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.3 Initialize database (seed + initial admin)

```bash
npm run init-db
```

### 2.4 Start the server

```bash
npm run dev
```

Open: http://localhost:3000

Entry points:

- Login: `/auth/login`
- Admin panel: `/admin`

---

## 3) Production (Vercel)

Recommended checklist:

1) Set environment variables in Vercel (Production):
   - `MONGODB_URI`
   - `NEXTAUTH_URL=https://www.999wrldnetwork.es`
   - `NEXTAUTH_SECRET`
   - `SITE_NAME=999Wrld Network`
   - `SITE_URL=https://www.999wrldnetwork.es`
2) MongoDB Atlas:
   - `Network Access` → allowlist your IP (or temporarily `0.0.0.0/0` for testing)
   - Correct DB user/password
3) Uploads in production: use **Vercel Blob** or **Cloudinary** (see section 5).
4) Deploy.

---

## 4) Environment variables

The full reference is in `.env.example`. Summary:

### Required

- `MONGODB_URI`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

### Recommended (production)

- `SITE_NAME`
- `SITE_URL` (for SEO, email links, and sitemap)

### Minecraft server status

- `MINECRAFT_SERVER_IP` / `MINECRAFT_SERVER_PORT`
- `MC_ONLINE_MODE` (`true` online-mode / `false` offline-mode)

---

## 5) Uploads

- Local/dev: files are written to `public/uploads/...`.
- Vercel/prod: ephemeral filesystem → configure a provider.

Options:

- **Vercel Blob**: `BLOB_READ_WRITE_TOKEN`
- **Cloudinary**: `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`

---

## 6) Email (Forgot password)

To make password reset work in production, configure SMTP:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`

Notes:

- If SMTP is not configured, the endpoint may still return OK but it won’t send emails.
- In Vercel also set `SITE_URL` and `NEXTAUTH_URL` to your real domain.

---

## 7) Payments (PayPal/Stripe)

Optional (if you use the store/checkout):

- PayPal: `PAYPAL_ENV`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`
- Stripe: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## 8) Newsletter + Cron

The newsletter cron endpoint is:

- `/api/cron/newsletter-weekly`

Recommendation:

- Define `CRON_SECRET` for safe manual testing.

Example:

```bash
curl -i "https://YOUR_DOMAIN/api/cron/newsletter-weekly?secret=YOUR_CRON_SECRET"
```


---

## 9) SEO + Search Console

Includes:

- `GET /sitemap.xml`
- `GET /robots.txt`
- Canonical URLs + OpenGraph/Twitter
- JSON-LD (Organization/WebSite + NewsArticle/DiscussionForumPosting)

Recommended for production:

1) `SITE_URL=https://www.999wrldnetwork.es`
2) Verification:
   - `GOOGLE_SITE_VERIFICATION`
   - `BING_SITE_VERIFICATION`
3) In Search Console: submit `https://www.999wrldnetwork.es/sitemap.xml`

---

## 10) Database (Compass)

Recommended: **MongoDB Compass**

1) Download: https://www.mongodb.com/try/download/compass
2) Connect using your `MONGODB_URI`
3) Inspect collections (`users`, `products`, `blogposts`, `forumposts`, ...)

---

## 11) Useful commands

- Dev: `npm run dev`
- Build: `npm run build`
- Local prod: `npm run build && npm start`
- Linter: `npm run lint`
- Seed DB: `npm run init-db`
- Project stats: `npm run stats`

If something fails, check **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**.
Note: **HeidiSQL does not work with MongoDB** (it’s for SQL).


