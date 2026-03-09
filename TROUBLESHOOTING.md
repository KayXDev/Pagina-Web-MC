<p align="center">
	<img src="public/icon.png" alt="999Wrld Network" width="88" height="88" />
</p>

<h1 align="center">Troubleshooting</h1>

<p align="center">
	Quick diagnosis guide for the most common local and production problems:
	startup issues, license failures, auth, MongoDB, uploads, cron, payments and SEO.
</p>

<p align="center">
	<a href="README.md"><strong>README</strong></a>
	·
	<a href="SETUP.md"><strong>Setup</strong></a>
	·
	<a href="docs/license-system.md"><strong>License Docs</strong></a>
	·
	<a href="CHANGELOG.md"><strong>Changelog</strong></a>
</p>

<p align="center">
	<img alt="Troubleshooting" src="https://img.shields.io/badge/Guide-Debugging-f59e0b" />
	<img alt="Startup" src="https://img.shields.io/badge/Startup-License%20Aware-dc2626" />
	<img alt="Deploy" src="https://img.shields.io/badge/Deploy-Vercel-black" />
</p>

---

## 🧭 Table of Contents

- [⚡ Quick checklist](#-quick-checklist)
- [🚨 App does not reach Ready](#-app-does-not-reach-ready)
- [🔐 Redirected to `/licencia`](#-redirected-to-licencia)
- [👤 Auth / login issues](#-auth--login-issues)
- [🗄️ MongoDB issues](#️-mongodb-issues)
- [🌍 Production-only issues](#-production-only-issues)
- [🖼️ Upload issues](#️-upload-issues)
- [✉️ Email issues](#️-email-issues)
- [🕒 Newsletter cron issues](#-newsletter-cron-issues)
- [💳 Payment issues](#-payment-issues)
- [🗺️ SEO issues](#️-seo-issues)
- [📤 What to share when asking for help](#-what-to-share-when-asking-for-help)

---

## ⚡ Quick checklist

Good first pass for most problems:

```bash
rm -rf .next
npm install
npm run dev
```

Then confirm the minimum `.env` values exist:

- `MONGODB_URI`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `KAYX_LICENSE_KEY`
- `KAYX_PRODUCT_ID`

---

## 🚨 App does not reach Ready

Typical causes:

### 1) License validation failed

Symptoms:

- `npm run dev` stops early
- `npm start` stops early
- the terminal shows a license authentication or integrity error

Check:

- `KAYX_LICENSE_KEY`
- `KAYX_PRODUCT_ID`
- whether the license API is reachable from your machine/server
- embedded license defaults in [lib/license-defaults.mjs](lib/license-defaults.mjs)

If startup fails because of licensing, read **[docs/license-system.md](docs/license-system.md)** first.

### 2) Corrupted Next.js cache

Fix:

```bash
rm -rf .next
npm run dev
```

### 3) Dependencies are out of sync

Fix:

```bash
rm -rf node_modules .next
npm install
npm run dev
```

### 4) The server starts but the banner looks wrong

The project uses a custom dev wrapper in `scripts/dev.mjs`.

If the process is alive but the terminal UI looks stuck, verify whether Next is still serving requests before assuming the app is down.

---

## 🔐 Redirected to `/licencia`

This means runtime validation failed in middleware.

Common reasons:

- missing license environment variables
- wrong product ID
- unreachable license server
- invalid or expired license

Useful check:

- if you are an admin, open `/admin/licencia`

That panel helps confirm whether the problem is startup-only or runtime validation.

---

## 👤 Auth / login issues

### Login does not work

Check:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- MongoDB connection
- whether the initial admin was seeded

Create the initial admin again if needed:

```bash
npm run init-db
```

### Missing NextAuth secret

Generate a new secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Restart the app afterwards.

---

## 🗄️ MongoDB issues

### Authentication failed

Usually one of these:

- wrong username/password in `MONGODB_URI`
- password contains special characters and is not encoded correctly
- wrong cluster host or database name

### Cannot connect to Atlas

Check:

- Atlas **Network Access** allowlist
- database user permissions
- exact connection string copied from Atlas

---

## 🌍 Production-only issues

### Works locally but not on Vercel

Check:

- Production environment variables are actually set
- the project was redeployed after env changes
- `SITE_URL` and `NEXTAUTH_URL` match the final domain
- the license API is reachable from Vercel

### Environment changes do nothing

Redeploy. Vercel does not apply new environment variables to old deployments.

---

## 🖼️ Upload issues

### Uploads work locally but disappear in production

That is expected if you rely on local filesystem storage on Vercel.

Use one of these instead:

- `BLOB_READ_WRITE_TOKEN` for Vercel Blob
- `CLOUDINARY_URL`
- or the separate Cloudinary credentials

### Upload rejected

The upload helper accepts common image formats and rejects invalid types or oversized files.

---

## ✉️ Email issues

### Password reset or newsletter emails are not sending

Check:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

If SMTP is missing, email-dependent features will not deliver real messages.

---

## 🕒 Newsletter cron issues

### Route returns `401` or `403`

Use one of these:

- Vercel cron with `User-Agent: vercel-cron/1.0`
- `x-cron-secret: YOUR_SECRET`
- `?secret=YOUR_SECRET`

### Newsletter does not send

Check:

- SMTP is configured
- `SITE_URL` or `NEXTAUTH_URL` is set
- newsletter automation is enabled in admin settings
- the request is happening on the configured weekday/time slot

---

## 💳 Payment issues

### Store checkout fails

Check the provider you are using.

**PayPal**

- `PAYPAL_ENV`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`

**Stripe**

- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`

Also confirm you are not mixing test and live keys.

---

## 🗺️ SEO issues

### Wrong domain in sitemap, canonical tags, or email links

Check:

- `SITE_URL`
- `NEXTAUTH_URL`

### Search Console verification fails

Check:

- `GOOGLE_SITE_VERIFICATION`
- `BING_SITE_VERIFICATION`

Redeploy after changing them.

---

## 📤 What to share when asking for help

If you need deeper debugging, share:

- the exact error message
- whether the issue is local or production-only
- your Node version from `node -v`
- which area is failing: auth, license, uploads, email, payments, cron, or deploy
- relevant terminal output without leaking secrets