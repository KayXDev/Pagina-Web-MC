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
	<a href="docs/license-system.md"><strong>License Docs</strong></a>
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
	<img alt="Activation" src="https://img.shields.io/badge/Activation-KayX%20License-red" />
</p>

---

## 🧭 Table of Contents

- [🚨 License required to run](#-license-required-to-run)
- [✨ Highlights](#-highlights)
- [✨ Features](#-features)
- [🧱 Stack](#-stack)
- [✅ Requirements](#-requirements)
- [🚀 Quickstart](#-quickstart)
- [⚡ Quick Find (Where to Change Things)](#-quick-find-where-to-change-things)
- [🔐 Access & Roles](#-access--roles)
- [🔧 Environment Variables](#-environment-variables)
- [📜 Scripts](#-scripts)
- [🗺️ SEO (Sitemap/Robots/Schema)](#️-seo-sitemaprobotsschema)
- [📊 Project Stats](#-project-stats)
- [🖼️ Uploads (Local vs Production)](#️-uploads-local-vs-production)
- [🌍 Deploy](#-deploy)
- [🧯 Troubleshooting](#-troubleshooting)
- [🔒 Security](#-security)
- [📝 Changelog](CHANGELOG.md)

---

## 🚨 License required to run

<p align="center">
	<img alt="License required" src="https://img.shields.io/badge/License-Required-red?style=for-the-badge" />
	<img alt="KayX activation" src="https://img.shields.io/badge/KayX-Activation-blueviolet?style=for-the-badge" />
	<img alt="Discord support" src="https://img.shields.io/badge/Support-Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
</p>

> [!IMPORTANT]
> This project will **not start** without a valid **KayX License**.
> A license is required in both **development** and **production**, and activation/support is handled through the official **[Discord server](https://discord.gg/wrld999)**.

Required variables:

```env
KAYX_LICENSE_KEY=YOUR_LICENSE_KEY
KAYX_PRODUCT_ID=YOUR_PRODUCT_NAME
KAYX_LICENSE_API_URL=http://YOUR_SERVER:3001/api/client
KAYX_API_TOKEN=YOUR_API_KEY
```

Full guide:

- [Check **DOCS** right here](docs/license-system.md)

### 🛡️ If the license is missing or invalid

- App startup is blocked
- The website redirects to the license screen
- Protected API routes return `403`
- Users are told to open a Discord ticket [here](https://discord.gg/wrld999)

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

4) Fill the required `.env` values, including the KayX license settings.

5) Initialize the database (seed + initial admin):

```bash
npm run init-db
```

6) Start the development server:

```bash
npm run dev
```

Open: http://localhost:3000

For a complete setup guide (local + production), see **[SETUP.md](SETUP.md)**.

---

## ⚡ Quick Find (Where to Change Things)

Quick guide to find text locations fast.

### 1) Core Rules (Important)

| Case | Where to edit | Notes |
|---|---|---|
| Text that uses `t(lang, '...')` | `lib/i18n.ts` | Always update both `es` and `en` to keep translations consistent. |
| Hardcoded JSX text | `app/**/page.tsx` or `components/**/*.tsx` | If it does not use `t(...)`, edit that file or migrate it to i18n. |
| Global SEO title/description | `app/layout.tsx` | `metadata.title`, `metadata.description`, `openGraph`, `twitter`. |
| Site name in JSON-LD | `app/layout.tsx` | `orgJsonLd` and `websiteJsonLd` (uses `SITE_NAME` if available). |

### 2) Global Text (Whole Site)

| What you want to change | File | Keys/area |
|---|---|---|
| Navbar labels (Home, Shop, Vote, etc.) | `lib/i18n.ts` | `nav.*` |
| User menu labels (Admin, Profile, Sign out) | `lib/i18n.ts` | `user.*` |
| Full footer text | `lib/i18n.ts` | `footer.*` |
| Language selector labels (Spanish/English) | `lib/i18n.ts` | `lang.*` |
| Common labels (Save, Cancel, etc.) | `lib/i18n.ts` | `common.*` |
| Navbar component structure/icons/buttons | `components/Navbar.tsx` | UI structure; labels should preferably come from i18n |
| Footer component | `components/Footer.tsx` | Check for any additional hardcoded text |

### 3) Public Pages (App Router)

| Route | File | Where text usually lives |
|---|---|---|
| `/` | `app/page.tsx` | Hero (`<h1>`), primary buttons, home blocks |
| `/tienda` | `app/tienda/page.tsx` | Shop header, filters, product cards |
| `/carrito` | `app/carrito/page.tsx` | Checkout, summary, states and toasts |
| `/vote` | `app/vote/page.tsx` | `vote.*` in i18n + potential local labels |
| `/noticias` | `app/noticias/page.tsx` | `news.*` + listing text |
| `/noticias/[slug]` | `app/noticias/[slug]/page.tsx` | Post details, likes, errors |
| `/foro` | `app/foro/page.tsx` | Feed, create post, filters, toasts |
| `/foro/[id]` | `app/foro/[id]/page.tsx` | Details, replies, actions |
| `/soporte` | `app/soporte/page.tsx` | Tickets, states, form |
| `/soporte/[id]` | `app/soporte/[id]/page.tsx` | Ticket chat, actions |
| `/perfil` | `app/perfil/page.tsx` | Header and summary |
| `/perfil/ajustes` | `app/perfil/ajustes/page.tsx` | Account settings, errors/toasts |
| `/staff` | `app/staff/page.tsx` | Staff page text and applications |
| `/normas` | `app/normas/page.tsx` | Rules and tables |
| `/terminos` | `app/terminos/page.tsx` | Legal |
| `/privacidad` | `app/privacidad/page.tsx` | Legal |
| `/cookies` | `app/cookies/page.tsx` | Legal/cookies |
| `/mantenimiento` | `app/mantenimiento/page.tsx` | Visual message and fallback |

### 4) Admin Panel (Most Used Areas)

| Admin route | File | Main text areas |
|---|---|---|
| `/admin` | `app/admin/page.tsx` | Dashboard, KPIs, quick actions |
| Admin side layout | `app/admin/layout.tsx` | Sidebar, groups, breadcrumbs |
| `/admin/users` | `app/admin/users/page.tsx` | User table, actions |
| `/admin/users/[userId]` | `app/admin/users/[userId]/page.tsx` | User details |
| `/admin/products` | `app/admin/products/page.tsx` | Product CRUD |
| `/admin/tickets` | `app/admin/tickets/page.tsx` | Support inbox + webhook |
| `/admin/foro` | `app/admin/foro/page.tsx` | Forum moderation |
| `/admin/blog` | `app/admin/blog/page.tsx` | News/blog CRUD |
| `/admin/badges` | `app/admin/badges/page.tsx` | Badge management |
| `/admin/coupons` | `app/admin/coupons/page.tsx` | Coupons and coupon webhook |
| `/admin/referrals` | `app/admin/referrals/page.tsx` | Referrals and rewards |
| `/admin/newsletter` | `app/admin/newsletter/page.tsx` | Newsletter, status, schedule |
| `/admin/postulaciones` | `app/admin/postulaciones/page.tsx` | Staff applications |
| `/admin/logs` | `app/admin/logs/page.tsx` | Admin history + webhook |
| `/admin/services-status` | `app/admin/services-status/page.tsx` | Service status + reports |
| `/admin/settings` | `app/admin/settings/page.tsx` | Maintenance and settings |
| `/admin/permisos` | `app/admin/permisos/page.tsx` | Section permissions |
| `/admin/partner` | `app/admin/partner/page.tsx` | Partner management |

### 5) i18n Keys by Module (Quick Map)

Base file: `lib/i18n.ts`

| Module | Key prefix |
|---|---|
| Home | `home.*` |
| Auth | `auth.*` |
| Shop | `shop.*` |
| Rules | `rules.*` |
| Staff | `staff.*` |
| News | `news.*` |
| Forum | `forum.*` |
| Support/Tickets | `support.*` |
| Profile | `profile.*` |
| Vote | `vote.*` |
| Notifications | `notifications.*` |
| Full admin | `admin.*` |
| Footer | `footer.*` |
| Chatbot | `chatbot.*` |
| Public partner | `partnerPublic.*` |

### 6) Recommended Workflow for Safe Text Changes

1. First check whether the text comes from i18n (`t(lang, '...')`).
2. If it comes from i18n, edit only `lib/i18n.ts` in both `es` and `en`.
3. If it is hardcoded, edit the page/component file and consider migrating it to i18n.
4. Verify the same route in both languages using the selector (`LanguageSwitcher`).
5. If you change admin labels, validate both desktop and mobile (`app/admin/layout.tsx`).

### 7) Useful Commands for Translation Audits

Find potentially hardcoded text in admin:

```bash
rg "lang === 'es'|\?\s*'[^']{3,}'\s*:\s*'[^']{3,}'|toast\.(error|success|warn)\([^\)]*'Error'" app/admin
```

Find possible non-i18n text across pages:

```bash
rg "'[^']{4,}'|\"[^\"]{4,}\"" app --glob "**/*.tsx"
```

If `rg` is not installed, use `grep -R` as an alternative.

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
| `KAYX_LICENSE_KEY` | ✅ | Buyer license key generated in KayX / Drako |
| `KAYX_PRODUCT_ID` | ✅ | Exact product name/ID configured in the license panel |
| `KAYX_LICENSE_API_URL` | ✅ | REST endpoint used to validate the license |
| `KAYX_API_TOKEN` | ✅ | REST API token sent in the `Authorization` header |
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
| `KAYX_SHARED_SECRET` | Extra shared secret if your license instance uses one |
| `LICENSE_FAIL_OPEN` | Temporary fail-open behavior if the license API is down |
| `LICENSE_CACHE_TTL_MS` | License validation cache duration in milliseconds |
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
