# KayX License System Guide

Complete guide for configuring, validating, and deploying the license system used by this project.

---

## Table of Contents

- [1) How the protection works](#1-how-the-protection-works)
- [2) Core files used by the license system](#2-core-files-used-by-the-license-system)
- [3) What you need before starting](#3-what-you-need-before-starting)
- [4) Configure the Discord Developer Portal](#4-configure-the-discord-developer-portal)
- [5) Configure the KayX bot](#5-configure-the-kayx-bot)
- [6) Configure this website locally](#6-configure-this-website-locally)
- [7) Local testing flow](#7-local-testing-flow)
- [8) Deploy on Vercel or VPS](#8-deploy-on-vercel-or-vps)
- [9) Troubleshooting](#9-troubleshooting)
- [10) Integrity guard against missing files](#10-integrity-guard-against-missing-files)
- [11) Security notes](#11-security-notes)

---

## 1) How the protection works

This project validates the license in two layers:

1. **Startup validation**
   - `npm run dev` and `npm start` run a license check before Next.js starts.
   - If the license is invalid, the app does not boot.

2. **Runtime validation**
   - The middleware validates the license on requests.
   - If validation fails:
     - protected pages redirect to `/licencia`
     - protected API routes return `403`

This means the license API must be reachable from the environment where the app is running.

---

## 2) Core files used by the license system

Main files:

- `lib/license.ts` → central validator used by the app
- `middleware.ts` → blocks access when the license is invalid
- `scripts/license-check.mjs` → startup validation before boot
- `app/licencia/page.tsx` → license-required page shown to users
- `app/api/license/status/route.ts` → JSON status endpoint
- `lib/license-seal.js` → integrity seal used by the system

If one of the core files checked by the startup integrity guard is missing, startup fails.

---

## 3) What you need before starting

You need all of the following:

- a working KayX Licenses Lite bot
- a Discord application and bot token for that licensing bot
- the exact product name or product ID configured in the licensing panel
- a generated buyer license key
- the REST API key used by the licensing API
- a reachable REST endpoint such as:
  - `http://YOUR_HOST:3001/api/client`
  - or preferably `https://licenses.yourdomain.com/api/client`

Required website environment variables:

```env
KAYX_LICENSE_KEY=YOUR_LICENSE_KEY
KAYX_PRODUCT_ID=YOUR_PRODUCT_NAME
KAYX_LICENSE_API_URL=http://YOUR_HOST:3001/api/client
KAYX_API_TOKEN=YOUR_API_KEY
```

Optional:

```env
KAYX_SHARED_SECRET=
LICENSE_FAIL_OPEN=false
LICENSE_CACHE_TTL_MS=300000
```

---

## 4) Configure the Discord Developer Portal

The website does not validate against Discord directly.
Discord is only used because the KayX bot itself needs a Discord application.

Open:

- <https://discord.com/developers/applications>

### 4.1 Create the application

1. Click **New Application**.
2. Enter the application name.
3. Accept the terms.
4. Open the application dashboard.

### 4.2 Create the bot

1. Open the **Bot** tab.
2. Click **Add Bot**.
3. Confirm creation.
4. Copy the bot token.
5. Paste that token into the licensing bot configuration where the package asks for it.

### 4.3 Enable intents only if your bot needs them

Depending on the licensing package, you may need one or more of these:

- **Presence Intent**
- **Server Members Intent**
- **Message Content Intent**

Enable only the intents required by your licensing bot setup.

### 4.4 Invite the bot to your server

1. Open **OAuth2** → **URL Generator**.
2. Select scopes:
   - `bot`
   - `applications.commands` if the bot uses slash commands
3. Select the permissions required by the licensing bot.
4. Open the generated URL.
5. Invite the bot to your server.

### 4.5 Redirect URLs

Only configure OAuth2 redirect URLs if your licensing bot or dashboard explicitly requires them.
They are not required for this website's license validation flow.

---

## 5) Configure the KayX bot

Inside the licensing bot or panel, verify all of this.

### 5.1 Product name / product ID

The value in the website must match the value in the licensing panel exactly.

Example:

```env
KAYX_PRODUCT_ID=Unban
```

These are all different values:

- `Unban`
- `unban`
- `UNBAN`
- `Minecraft Unban`

Use the exact one configured in the panel.

### 5.2 License key

Generate the buyer key in the licensing panel and place it in:

```env
KAYX_LICENSE_KEY=YOUR_LICENSE_KEY
```

### 5.3 API token

For the `/api/client` flow, the API token is sent in the `Authorization` header.
In many setups this comes from the web server or REST API configuration of the licensing bot.

```env
KAYX_API_TOKEN=YOUR_API_KEY
```

### 5.4 API URL

Use the URL that your deployed website can actually reach.

#### Local machine + local bot

```env
KAYX_LICENSE_API_URL=http://localhost:3001/api/client
```

#### Vercel + bot on VPS

```env
KAYX_LICENSE_API_URL=http://YOUR_VPS_IP:3001/api/client
```

Better:

```env
KAYX_LICENSE_API_URL=https://licenses.yourdomain.com/api/client
```

#### Website and bot on the same VPS

```env
KAYX_LICENSE_API_URL=http://localhost:3001/api/client
```

That only works because both services are on the same machine.

### 5.5 Public access requirements

If the website runs outside the VPS, the license API must be publicly reachable.

Check all of this:

- the service listens on `0.0.0.0` or the public network interface
- the service is not bound only to `127.0.0.1`
- the port is open in the VPS firewall
- the hosting provider allows the port
- the DNS record points to the correct VPS
- the reverse proxy is forwarding requests correctly if you use a domain

---

## 6) Configure this website locally

### 6.1 Create `.env`

Copy the example file:

```bash
cp .env.example .env
```

### 6.2 Fill the required values

At minimum:

```env
MONGODB_URI=YOUR_MONGODB_URI
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=YOUR_SECRET
KAYX_LICENSE_KEY=YOUR_LICENSE_KEY
KAYX_PRODUCT_ID=YOUR_PRODUCT_NAME
KAYX_LICENSE_API_URL=http://YOUR_HOST:3001/api/client
KAYX_API_TOKEN=YOUR_API_KEY
```

### 6.3 Generate `NEXTAUTH_SECRET`

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 6.4 Initialize the database

```bash
npm run init-db
```

### 6.5 Start the app

```bash
npm run dev
```

If the license is valid, the app starts.
If the license is invalid, startup stops before Next.js boots.

---

## 7) Local testing flow

Recommended order:

1. Confirm the licensing bot itself is online.
2. Confirm the endpoint responds.
3. Confirm the product name is exact.
4. Confirm the API token is correct.
5. Confirm the buyer key is valid.
6. Start the website with `npm run dev`.
7. Visit `/api/license/status` to inspect the JSON response.

Expected behavior:

- valid license → app boots and pages work
- invalid license → startup stops or requests redirect to `/licencia`
- missing config → startup stops with a configuration error

---

## 8) Deploy on Vercel or VPS

### 8.1 Vercel

On Vercel, do not use `localhost` for the license API unless the API is also inside the same runtime, which is not the case here.

Add these variables in **Vercel → Project → Settings → Environment Variables**:

- `KAYX_LICENSE_KEY`
- `KAYX_PRODUCT_ID`
- `KAYX_LICENSE_API_URL`
- `KAYX_API_TOKEN`
- optional: `KAYX_SHARED_SECRET`
- optional: `LICENSE_FAIL_OPEN`
- optional: `LICENSE_CACHE_TTL_MS`

Then redeploy.

### 8.2 VPS

If the website and the licensing bot are on the same VPS, `localhost` may be used.

If they are on different machines, use a reachable host or domain instead.

### 8.3 Preferred production setup

Best option:

- licensing bot on VPS
- domain/subdomain pointing to the VPS
- reverse proxy enabled
- HTTPS enabled
- website on Vercel or VPS using:

```env
KAYX_LICENSE_API_URL=https://licenses.yourdomain.com/api/client
```

---

## 9) Troubleshooting

### The license works locally but not on Vercel

Usually one of these:

- `localhost` is being used on Vercel
- the port is closed externally
- the bot only listens on `127.0.0.1`
- the DNS record is wrong
- the reverse proxy is wrong
- the product name does not match exactly
- the API token is invalid

### The app says the product is invalid

Check `KAYX_PRODUCT_ID` carefully.
Case and spacing matter.

### The app says unauthorized or invalid API key

Check `KAYX_API_TOKEN` in both the bot configuration and the website environment variables.

### The API URL opens locally but not publicly

The service is probably not exposed outside the VPS.
Check the bind address, firewall, hosting panel, and reverse proxy.

### The app redirects to `/licencia`

The middleware is blocking access because runtime validation failed.
Use `/api/license/status` to inspect the status more easily.

---

## 10) Integrity guard against missing files

A file-existence guard has been added to make accidental removal of license files break startup.

Current behavior:

- startup checks a list of required license files
- if one of those files is missing, `npm run dev` and `npm start` fail
- the app also depends on a dedicated license seal file

Important limitation:

This is an **anti-tamper barrier**, not perfect protection.
If someone has the full source code, they can still modify the code deliberately.
The strongest protection is still to keep critical premium logic on a remote server you control.

---

## 11) Security notes

- never commit `.env`
- rotate secrets immediately if they were exposed
- never share:
  - MongoDB URI credentials
  - `KAYX_API_TOKEN`
  - `NEXTAUTH_SECRET`
  - Discord bot token
- prefer HTTPS for production license validation

---

If a buyer has license issues, direct them to your support Discord and ask them to open a ticket.
