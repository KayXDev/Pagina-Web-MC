# 🔧 Troubleshooting

Quick diagnosis guide for common issues in local development and production (Vercel): login/auth, MongoDB, blank screen, uploads, cron/newsletter, SEO, and build.

---

## Table of Contents

- [Quick checklist](#quick-checklist)
- [Blank screen / chunks 404](#blank-screen--chunks-404)
- [Auth / Login](#auth--login)
- [MongoDB Atlas](#mongodb-atlas)
- [Vercel (deploy + env)](#vercel-deploy--env)
- [Uploads (images)](#uploads-images)
- [Cron / Newsletter](#cron--newsletter)
- [SEO (sitemap/robots)](#seo-sitemaprobots)
- [Build / Dependencies](#build--dependencies)
- [What to share](#what-to-share)

---

## Quick checklist

Run these commands in order (good starting point for most issues):

```bash
# 1) Clear Next.js cache/build
rm -rf .next

# 2) Ensure deps
npm install

# 3) Check minimum env vars
cat .env | grep -E "MONGODB_URI|NEXTAUTH_URL|NEXTAUTH_SECRET" || true

# 4) Start
npm run dev
```

---

## Blank screen / chunks 404

Typical symptoms:

- Terminal shows `GET / 200` but nothing renders.
- In `Network` (F12) you see 404s for `/_next/static/chunks/...`.

Fix:

```bash
rm -rf .next
npm run dev
```

If it persists:

```bash
rm -rf .next node_modules
npm install
npm run dev
```

---

## Auth / Login

### "Login doesn’t work / can’t sign in"

Check:

- `NEXTAUTH_URL`
  - Local: `http://localhost:3000`
  - Production: `https://www.999wrldnetwork.es`
- `NEXTAUTH_SECRET` (stable, long and random; must not change between deploys)

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Error: "Unable to find next-auth secret"

`NEXTAUTH_SECRET` is missing or invalid → set a new one and restart.

### Create initial admin

```bash
npm run init-db
```

Admin login:

- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

---

## MongoDB Atlas

### "MongoServerError: Authentication failed"

- Wrong password in `MONGODB_URI`.
- If the password contains symbols, use URL-encoding.

Example:

```env
# ❌ WRONG
MONGODB_URI=mongodb+srv://user:<db_password>@cluster...

# ✅ RIGHT
MONGODB_URI=mongodb+srv://user:YourRealPassword123@cluster...
```

### "Network error / Cannot connect"

- Atlas → **Network Access** → add your IP.
- For temporary debugging: `0.0.0.0/0` (not recommended long-term).

---

## Vercel (deploy + env)

### I changed env vars in Vercel but nothing changes

- Vercel env vars apply per deployment → **Redeploy**.
- Make sure they’re set for **Production**.

### Weird behavior only in production

- Confirm `SITE_URL` and `NEXTAUTH_URL` point to the final domain.
- Check you don’t have different values between Preview and Production.

---

## Uploads (images)

On Vercel the filesystem is ephemeral: uploading to `public/uploads` will not persist.

Solutions:

- Vercel Blob: set `BLOB_READ_WRITE_TOKEN`
- Cloudinary: set `CLOUDINARY_URL` (or separate credentials)

---

## Cron / Newsletter

### Cron returns 401/403

- If `CRON_SECRET` exists, call it with `?secret=...`.
- If not, some endpoints expect `User-Agent: vercel-cron/1.0`.

### Newsletter doesn’t send

- Missing SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Also check provider spam/bounces.

---

## SEO (sitemap/robots)

### Sitemap/canonical uses the wrong domain

- Set `SITE_URL` in production (e.g. `https://www.999wrldnetwork.es`).
- Confirm `NEXTAUTH_URL` also points to the final domain.

### Search Console verification fails

- Set `GOOGLE_SITE_VERIFICATION` (and optionally `BING_SITE_VERIFICATION`) and redeploy.

---

## Build / Dependencies

### Error: "Cannot find module 'memory-pager'"

```bash
npm install memory-pager sparse-bitfield
```

### Verify before deploying

```bash
npm run lint
npm run build
```

---

## What to share

If you need help, share:

- The exact error message (terminal and/or browser console)
- Node version: `node -v`
- OS
- Values (without secrets) for: `NEXTAUTH_URL` and whether `SITE_URL` is set
