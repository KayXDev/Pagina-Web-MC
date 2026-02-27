# 999 Wrld Network

Full website for a Minecraft server with a **community / social network** style: Home with server status, news, forum, profiles, store, ticket-based support system, and a full **admin panel**.

## 🔗 Demo

- Live Demo: https://999wrldnetwork.es

---

## 🧭 Table of Contents

- [✨ Features](#-features)
- [🧱 Stack](#-stack)
- [✅ Requirements](#-requirements)
- [🚀 Local Installation](#-local-installation)
- [🔐 Access & Roles](#-access--roles)
- [🔧 Environment Variables](#-environment-variables)
- [📜 Scripts](#-scripts)
- [🖼️ Uploads (Local vs Production)](#️-uploads-local-vs-production)
- [🌍 Deploy](#-deploy)
- [🤖 Chatbot (AI + Human Agent)](#-chatbot-ai--human-agent)
- [🧯 Troubleshooting](#-troubleshooting)
- [🔒 Security](#-security)
- [📝 Changelog](#-changelog)

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

## 🚀 Local Installation

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

## 🤖 Chatbot (AI + Human Agent)

- AI Endpoint: `/api/chat` (Groq)
- Human escalation: The widget can create a **ticket** and continue the conversation with admins/staff.
- Admin inbox: `/admin/tickets`
- Language: The chatbot responds in **EN/ES** depending on user language and message.

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
