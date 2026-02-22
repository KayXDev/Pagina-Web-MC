# 999 Wrld Network

Web completa para un servidor de Minecraft con estilo **comunidad / red social**: Home con estado del servidor, noticias, foro, perfiles, tienda, soporte con tickets y un **panel de administración**.

## 🔗 Demo

- Live Demo: https://999wrld.vercel.app

## 🧭 Tabla de contenido

- [✨ Funcionalidades](#-funcionalidades)
- [🧱 Stack](#-stack)
- [✅ Requisitos](#-requisitos)
- [🚀 Instalación local](#-instalación-local)
- [🔐 Acceso y roles](#-acceso-y-roles)
- [🔧 Variables de entorno](#-variables-de-entorno)
- [📜 Scripts](#-scripts)
- [🖼️ Uploads (local vs producción)](#️-uploads-local-vs-producción)
- [🌍 Deploy](#-deploy)
- [🧯 Troubleshooting](#-troubleshooting)
- [🔒 Seguridad](#-seguridad)

## ✨ Funcionalidades

### 🌐 Público

- 🏠 Home con estado del servidor (IP/puerto configurables).
- 📰 Noticias/Blog (posts, vistas, likes).
- 💬 Foro (posts, replies, likes, vistas, imágenes).
- 👤 Perfiles públicos y privados (avatar, banner, actividad, follows).
- 🛒 Tienda (productos + categorías).
- 🎫 Soporte (tickets + chat).
- 🔔 Notificaciones.
- 📄 Páginas legales: términos, privacidad, normas.

### 🛠️ Admin (`/admin`)

- 📊 Dashboard con estadísticas + accesos rápidos.
- 👥 Usuarios (roles, bans, verificado, etc.).
- 🛍️ Productos/Tienda (CRUD).
- 🎫 Tickets/Soporte.
- 💬 Foro (moderación/gestión).
- 📰 Blog/Noticias (CRUD + imagen).
- 🧾 Postulaciones de staff.
- 🧠 Logs.
- ⚙️ Settings (incluye modo mantenimiento).
- 🔑 Permisos por secciones (OWNER).

## 🧱 Stack

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 14 (App Router) + React + TypeScript |
| UI | TailwindCSS + Framer Motion |
| Auth | NextAuth (JWT) |
| DB | MongoDB Atlas + Mongoose |
| Uploads (prod) | Vercel Blob (recomendado en Vercel) |
| IA (chatbot) | Groq (API compatible estilo OpenAI) |

## ✅ Requisitos

- Node.js **18.17+** (o Node 20+ recomendado)
- npm
- MongoDB (Atlas recomendado)

## 🚀 Instalación local

1) Instala dependencias:

```bash
npm install
```

2) Crea tu `.env` desde el ejemplo:

```bash
cp .env.example .env
```

3) Genera un secreto fuerte para NextAuth:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

4) Inicializa la base de datos (seed + admin inicial):

```bash
npm run init-db
```

5) Arranca el servidor en localhost:

```bash
npm run dev
```

Abre: http://localhost:3000

## 🔐 Acceso y roles

- Login: `/auth/login`
- Admin: `/admin`

Roles utilizados:

| Rol | Acceso |
|---|---|
| `OWNER` | Acceso total + permisos por secciones |
| `ADMIN` | Acceso a admin (puede limitarse por secciones) |
| `STAFF` | Acceso a admin (comportamiento “full” actual) |
| `USER` | Solo público + su perfil |

El usuario admin inicial se crea con `npm run init-db` usando `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

## 🔧 Variables de entorno

La referencia completa está en `.env.example`. Tabla rápida:

| Variable | Obligatoria | Uso |
|---|:---:|---|
| `MONGODB_URI` | ✅ | Conexión a MongoDB |
| `NEXTAUTH_URL` | ✅ | URL base (local: `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | ✅ | Secreto de NextAuth |
| `ADMIN_EMAIL` | ➖ | Email del admin inicial (seed) |
| `ADMIN_PASSWORD` | ➖ | Password del admin inicial (seed) |
| `SITE_NAME` | ➖ | Nombre del sitio |
| `SITE_URL` | ➖ | URL del sitio |
| `MINECRAFT_SERVER_IP` | ➖ | IP/host para status |
| `MINECRAFT_SERVER_PORT` | ➖ | Puerto para status |
| `NEXT_PUBLIC_STAFF_APPLICATIONS_OPEN` | ➖ | Abre/cierra postulaciones |
| `BLOB_READ_WRITE_TOKEN` | ➖ | Uploads en Vercel Blob (producción) |
| `GROQ_API_KEY` | ➖ | API key del chatbot (Groq) |
| `GROQ_MODEL` | ➖ | Modelo del chatbot (ej: `llama-3.1-8b-instant`) |
| `CLOUDINARY_URL` (o 3 vars) | ➖ | Uploads alternativos (opcional) |

Variables públicas (cliente):

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_MINECRAFT_SERVER_IP` | IP/host mostrado en Home |
| `NEXT_PUBLIC_DISCORD_URL` | Link del footer |
| `NEXT_PUBLIC_TIKTOK_URL` | Link del footer |
| `NEXT_PUBLIC_YOUTUBE_URL` | Link del footer |

## 📜 Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Dev en localhost |
| `npm run build` | Build de producción |
| `npm start` | Ejecuta el build |
| `npm run lint` | Lint |
| `npm run init-db` | Seed + crea admin inicial |

Otros scripts útiles:

- `node scripts/check-db.js`
- `node scripts/clean-db.js`
- `node scripts/reset-admin-password.js`
- `node scripts/set-owner.js --email tu@email.com --tags OWNER,FOUNDER`
- `node scripts/fix-tickets-index.js`

## 🖼️ Uploads (local vs producción)

- **Local/Dev**: se escriben archivos en `public/uploads/...`.
- **Producción (Vercel)**: el filesystem es efímero → usa **Vercel Blob** (necesita `BLOB_READ_WRITE_TOKEN`).

El helper soporta varios providers en este orden (según configuración):

- Cloudinary (si está configurado)
- Vercel Blob (si hay token)
- Filesystem local (solo dev)

Vercel Blob (producción en Vercel):

```env
BLOB_READ_WRITE_TOKEN=
```

Cloudinary (opcional, elige una opción):

**Opción A (1 variable):**

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

**Opción B (3 variables):**

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## 🌍 Deploy

Recomendado: **Vercel**.

Checklist:

1) Configura variables de entorno en tu provider (igual que `.env`).
2) MongoDB Atlas: revisa usuarios/credenciales y **Network Access** (IP allowlist).
3) Ajusta `NEXTAUTH_URL` al dominio real.
4) Si hay uploads en Vercel: configura `BLOB_READ_WRITE_TOKEN` (Vercel Blob). (Cloudinary es opcional.)

## 🤖 Chatbot (IA + agente humano)

- Endpoint IA: `/api/chat` (Groq)
- Derivación a humano: el widget puede abrir un **ticket** y continuar la conversación con admins/staff.
- Admin inbox: `/admin/tickets`
- Idioma: el chatbot responde en **es/en** (según el idioma del usuario y/o el mensaje).

## 📄 License

Este proyecto se publica bajo **AGPL-3.0**. Ver [LICENSE](LICENSE).

## 🧯 Troubleshooting

### Login no funciona

- Revisa `MONGODB_URI`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- Ejecuta `npm run init-db`
- Limpia cache: `rm -rf .next` y reinicia

### MongoDB no conecta

- Verifica password/usuario en Atlas
- Verifica IP allowlist en Atlas

Docs adicionales:

- `SETUP.md`
- `TROUBLESHOOTING.md`

## 🔒 Seguridad

- No subas `.env` al repo.
- Si un secreto se filtra, rota credenciales inmediatamente.
