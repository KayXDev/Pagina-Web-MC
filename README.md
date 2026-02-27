<p align="center">
	<img src="public/icon.png" alt="999Wrld Network" width="96" height="96" />
</p>

<h1 align="center">999Wrld Network</h1>

<p align="center">
	Full-featured website for a Minecraft server with a <strong>community / social network</strong> vibe:
	news, forum, profiles, store, support tickets and a complete admin panel.
</p>

<p align="center">
	<a href="https://www.999wrldnetwork.es"><strong>Live site</strong></a>
	·
	<a href="SETUP.md"><strong>Setup</strong></a>
	·
	<a href="TROUBLESHOOTING.md"><strong>Troubleshooting</strong></a>
	·
	<a href="CHANGELOG.md"><strong>Changelog</strong></a>
</p>

<p align="center">
	<img alt="Next.js" src="https://img.shields.io/badge/Next.js-14-black" />
	<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue" />
	<img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-brightgreen" />
	<img alt="Auth" src="https://img.shields.io/badge/Auth-NextAuth-orange" />
	<img alt="License" src="https://img.shields.io/badge/License-AGPL--3.0-informational" />
</p>

---

## 🧭 Table of Contents

- [✨ Highlights](#-highlights)
- [✨ Features](#-features)
- [🧱 Stack](#-stack)
- [✅ Requirements](#-requirements)
- [🚀 Quickstart](#-quickstart)
- [🔐 Access & Roles](#-access--roles)
- [🔧 Environment Variables](#-environment-variables)
- [📜 Scripts](#-scripts)
- [🗺️ SEO (Sitemap/Robots/Schema)](#️-seo-sitemaprobotsschema)
- [📊 Project Stats](#-project-stats)
- [🖼️ Uploads (Local vs Production)](#️-uploads-local-vs-production)
- [🌍 Deploy](#-deploy)
- [🧯 Troubleshooting](#-troubleshooting)
- [🔒 Security](#-security)
- [📝 Changelog](#-changelog)

---

## ✨ Highlights

- Social identity: `@username` + `displayName` (like a social app).
- Dynamic content: blog/news + forum with media.
- Production-ready admin panel with roles, moderation and settings.
- SEO-ready: `sitemap.xml`, `robots.txt`, canonical URLs and JSON-LD.
- Deploy-friendly: MongoDB Atlas + NextAuth + uploads compatible with Vercel.

---

## ✨ Features

### 🌐 Public

- 🏠 Home with server status (configurable IP/port).
- 📰 News/Blog (posts, views, likes).
- 💬 Forum (posts, replies, likes, views, images).
- 👤 Public & private profiles (avatar, banner, activity, follows).
- 🛒 Store (products + categories).
- 🎫 Support (tickets + chat).
- 🔔 Notifications.
- 📄 Legal pages: terms, privacy policy, rules.

### 🛠️ Admin (`/admin`)

- 📊 Dashboard with statistics + quick access.
- 👥 Users (roles, bans, verification, etc.).
- 🛍️ Store/Products (CRUD).
- 🎫 Tickets/Support.
- 💬 Forum (moderation/management).
- 📰 Blog/News (CRUD + image).
- 🧾 Staff applications.
- 🧠 Logs.
- ⚙️ Settings (includes maintenance mode).
- 🔑 Section-based permissions (OWNER).

---

## 🧱 Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router) + React + TypeScript |
| UI | TailwindCSS + Framer Motion |
| Auth | NextAuth (JWT) |
| Database | MongoDB Atlas + Mongoose |
| Uploads (prod) | Vercel Blob (recommended on Vercel) |
| AI (chatbot) | Groq (OpenAI-compatible API style) |

---

## ✅ Requirements

- Node.js **18.17+** (Node 20+ recommended)
- npm
- MongoDB (Atlas recommended)

---

## 🚀 Quickstart

1) Install dependencies:

```bash
npm install
```

2) Create your `.env` file from the example:

```bash
cp .env.example .env
```

3) Generate a strong secret for NextAuth:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

4) Initialize the database (seed + initial admin):

```bash
npm run init-db
```

5) Start the development server:

```bash
npm run dev
```

Open: http://localhost:3000

For a complete setup guide (local + production), see **[SETUP.md](SETUP.md)**.

---

## 🔐 Access & Roles

- Login: `/auth/login`
- Admin: `/admin`

### Roles

| Role | Access |
|------|--------|
| `OWNER` | Full access + section-based permissions |
| `ADMIN` | Admin access (can be limited by section) |
| `STAFF` | Admin access (currently full behavior) |
| `USER` | Public access + own profile |

The initial admin user is created with `npm run init-db` using `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

---

## 🔧 Environment Variables

Full reference available in `.env.example`.

### Required

| Variable | Required | Purpose |
|-----------|:--------:|----------|
| `MONGODB_URI` | ✅ | MongoDB connection |
| `NEXTAUTH_URL` | ✅ | Base URL (local: `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | ✅ | NextAuth secret |

### Optional

| Variable | Purpose |
|------------|----------|
| `ADMIN_EMAIL` | Initial admin email (seed) |
| `ADMIN_PASSWORD` | Initial admin password (seed) |
| `SITE_NAME` | Website name |
| `SITE_URL` | Website URL |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console HTML tag content |
| `BING_SITE_VERIFICATION` | Bing Webmaster Tools HTML tag content |
| `MINECRAFT_SERVER_IP` | Server IP/host for status |
| `MINECRAFT_SERVER_PORT` | Server port for status |
| `NEXT_PUBLIC_STAFF_APPLICATIONS_OPEN` | Open/close staff applications |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob uploads (production) |
| `GROQ_API_KEY` | Chatbot API key (Groq) |
| `GROQ_MODEL` | Chatbot model (e.g. `llama-3.1-8b-instant`) |
| `CLOUDINARY_URL` (or 3 vars) | Alternative uploads (optional) |

### Public (Client-side)

| Variable | Purpose |
|------------|----------|
| `NEXT_PUBLIC_MINECRAFT_SERVER_IP` | Displayed server IP on Home |
| `NEXT_PUBLIC_DISCORD_URL` | Footer link |
| `NEXT_PUBLIC_TIKTOK_URL` | Footer link |
| `NEXT_PUBLIC_YOUTUBE_URL` | Footer link |

---

## 📜 Scripts

| Script | Description |
|--------|------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Run production build |
| `npm run lint` | Run linter |
| `npm run init-db` | Seed DB + create initial admin |
| `npm run stats` | Print project stats (files/dirs/LOC) |

### Additional Useful Scripts

- `node scripts/check-db.js`
- `node scripts/clean-db.js`
- `node scripts/reset-admin-password.js`
- `node scripts/set-owner.js --email your@email.com --tags OWNER,FOUNDER`
- `node scripts/fix-tickets-index.js`

---

## 🖼️ Uploads (Local vs Production)

- **Local/Dev**: Files are written to `public/uploads/...`.
- **Production (Vercel)**: Filesystem is ephemeral → use **Vercel Blob** (`BLOB_READ_WRITE_TOKEN` required).

Upload helper supports providers in this order (based on configuration):

1. Cloudinary (if configured)
2. Vercel Blob (if token is present)
3. Local filesystem (dev only)

### Vercel Blob (Production on Vercel)

```env
BLOB_READ_WRITE_TOKEN=
```

### Cloudinary (Optional)

**Option A (1 variable):**

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

**Option B (3 variables):**

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

---

## 🌍 Deploy

Recommended: **Vercel**

### Checklist

1. Configure environment variables in your hosting provider (same as `.env`).
2. MongoDB Atlas: verify credentials and **Network Access (IP allowlist)**.
3. Set `NEXTAUTH_URL` to your real domain.
4. If using uploads on Vercel → configure `BLOB_READ_WRITE_TOKEN`.

---

## 🗺️ SEO (Sitemap/Robots/Schema)

This project ships with:

- `GET /sitemap.xml` (includes static routes + dynamic blog/forum URLs when DB is available)
- `GET /robots.txt`
- Canonical URLs (`metadataBase` + per-section canonical)
- JSON-LD: `Organization`, `WebSite`, plus `NewsArticle` and `DiscussionForumPosting` on dynamic pages.

Recommended for production:

1) Set `SITE_URL=https://www.999wrldnetwork.es`
2) Verify ownership in Google Search Console and submit your sitemap.

---

## 📊 Project Stats

Generated by `npm run stats`.

Generated: 2026-02-27T13:35:52.930Z

| Metric | Value |
|---|---:|
| Total files | 278 |
| Total directories | 203 |
| Text files counted | 267 |
| Total lines (text) | 40,381 |
| Non-empty lines (text) | 35,576 |

Top file types (by non-empty lines):

| Ext | Files | Lines | Non-empty |
|---|---:|---:|---:|
| .tsx | 95 | 20,820 | 18,985 |
| .ts | 143 | 15,680 | 13,573 |
| .js | 9 | 1,193 | 981 |
| .md | 8 | 1,173 | 789 |
| (noext) | 3 | 644 | 522 |
| .mjs | 2 | 389 | 319 |
| .css | 1 | 145 | 117 |
| .example | 1 | 126 | 104 |
| .env | 1 | 115 | 94 |
| .json | 4 | 96 | 92 |

---

## 📄 License

This project is licensed under **AGPL-3.0**. See [LICENSE](LICENSE).

---

## 🧯 Troubleshooting

### Login not working

- Check `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- Run `npm run init-db`
- Clear cache: `rm -rf .next` and restart

### MongoDB connection fails

- Verify Atlas username/password
- Verify IP allowlist in Atlas

Additional documentation:

- `SETUP.md`
- `TROUBLESHOOTING.md`

---

## 🔒 Security

- Do NOT upload `.env` to the repository.
- If a secret leaks, rotate credentials immediately.
- Vulnerability reporting: see [SECURITY.md](SECURITY.md).

----

## 📊 Project Statistics

Current source code summary (excluding node_modules, .git, and build folders):

| Language     | Files | Lines of Code |
|-------------|--------|---------------|
| TypeScript  | 226    | 31,862        |
| JSON        | 5      | 8,542         |
| JavaScript  | 10     | 1,087         |
| Markdown    | 8      | 747           |
| CSS         | 1      | 111           |

### Totals

- 📁 **250 files**
- 💻 **42,349 lines of code**
- 📝 376 lines of comments
- 📄 4,279 blank lines

> Medium-to-large scale project with a modular architecture primarily built in TypeScript.

---

## 📝 Changelog

- See [CHANGELOG.md](CHANGELOG.md).

---
