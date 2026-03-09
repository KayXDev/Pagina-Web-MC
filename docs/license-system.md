<p align="center">
	<img src="../public/icon.png" alt="999Wrld Network" width="88" height="88" />
</p>

<h1 align="center">KayX License System</h1>

<p align="center">
	Important setup and behavior notes for the mandatory license protection used by this project.
	Only the parts that actually matter day to day.
</p>

<p align="center">
	<a href="../README.md"><strong>README</strong></a>
	·
	<a href="../SETUP.md"><strong>Setup</strong></a>
	·
	<a href="../TROUBLESHOOTING.md"><strong>Troubleshooting</strong></a>
	·
	<a href="../CHANGELOG.md"><strong>Changelog</strong></a>
</p>

<p align="center">
	<img alt="License required" src="https://img.shields.io/badge/License-Required-dc2626" />
	<img alt="Runtime protection" src="https://img.shields.io/badge/Protection-Startup%20%2B%20Runtime-7c3aed" />
	<img alt="Support" src="https://img.shields.io/badge/Support-Discord-5865F2" />
</p>

---

## 🧭 Table of Contents

- [🚨 What it does](#-what-it-does)
- [🔧 Required variables](#-required-variables)
- [⚙️ How validation works](#️-how-validation-works)
- [💻 Local setup](#-local-setup)
- [🌍 Production notes](#-production-notes)
- [🛡️ Common failure cases](#️-common-failure-cases)
- [🧪 Useful debug endpoint](#-useful-debug-endpoint)

---

## 🚨 What it does

This project uses a **mandatory KayX license check** in two places:

1. **Startup validation**
2. **Runtime validation**

Practical result:

- `npm run dev` will not finish booting without a valid license
- `npm start` will not start the production server without a valid license
- middleware blocks normal runtime access when validation fails
- invalid requests are redirected to `/licencia`
- protected API routes return `403`

---

## 🔧 Required variables

At minimum, configure these in `.env`:

```env
KAYX_LICENSE_KEY=YOUR_LICENSE_KEY
KAYX_PRODUCT_ID=YOUR_PRODUCT_NAME
KAYX_LICENSE_API_URL=http://YOUR_SERVER:3001/api/client
KAYX_API_TOKEN=YOUR_API_KEY
```

Optional hardening / behavior variables:

```env
KAYX_SHARED_SECRET=
LICENSE_FAIL_OPEN=false
LICENSE_CACHE_TTL_MS=300000
```

### What each one means

- `KAYX_LICENSE_KEY`: your buyer/license key
- `KAYX_PRODUCT_ID`: must exactly match the configured product in the license panel
- `KAYX_LICENSE_API_URL`: the REST endpoint this app calls to validate the license
- `KAYX_API_TOKEN`: API token used in the validation request
- `KAYX_SHARED_SECRET`: optional extra secret if your setup expects one

---

## ⚙️ How validation works

### Startup

- `npm run dev` uses a startup check before Next.js is considered ready
- `npm start` runs through `scripts/start.mjs`
- invalid config, integrity failures, or invalid license responses stop startup immediately

### Runtime

- middleware validates requests while the app is running
- bypass paths such as the license page and status endpoint remain available
- if runtime validation fails, users are sent to `/licencia`

This means the license API must be reachable from the environment where the app runs.

---

## 💻 Local setup

1. Copy `.env.example` to `.env`
2. Fill the required `KAYX_*` values
3. Make sure the license API is reachable from your machine
4. Run:

```bash
npm install
npm run init-db
npm run dev
```

If the license is valid, the app starts normally.
If not, startup stops and the terminal shows the reason.

---

## 🌍 Production notes

When deploying:

- do not use `localhost` unless the license service is actually running in the same environment
- ensure the license endpoint is publicly reachable from the deployment
- set all required `KAYX_*` variables in the host dashboard
- redeploy after any env change

Recommended pattern:

- app on **Vercel** or a VPS
- license API on a reachable VPS/domain
- HTTPS enabled for the license endpoint

---

## 🛡️ Common failure cases

### App will not start

Usually one of these:

- missing `KAYX_*` configuration
- wrong API token
- wrong product ID
- unreachable license API
- invalid or expired license
- license integrity files were removed or altered

### App starts but redirects to `/licencia`

Startup passed, but runtime validation is failing in middleware.

### Works locally but fails in production

Usually one of these:

- `KAYX_LICENSE_API_URL` still points to `localhost`
- the license service is not exposed publicly
- firewall or reverse proxy rules block access
- production env variables are incomplete

---

## 🧪 Useful debug endpoint

Use:

- `/api/license/status`

That endpoint helps confirm the current runtime validation result and is the first place to check before changing code.

---

> [!TIP]
> Keep it simple: if startup stops, read the license error first.
> Most license problems are configuration or connectivity issues, not application bugs.