<p align="center">
	<img src="../public/icon.png" alt="999Wrld Network" width="88" height="88" />
</p>

<h1 align="center">License System</h1>

<p align="center">
	Updated guide for the current license model used by this project.
	This version reflects the embedded validation defaults and the admin-only monitoring panel.
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

---

## What changed

The license flow is now simpler for the installer and stricter for the project owner:

- only `KAYX_LICENSE_KEY` and `KAYX_PRODUCT_ID` are required in `.env`
- the validation URL and internal token are embedded in code
- the project license monitor is available only in the admin panel
- the profile-facing license panel is no longer part of the user area

The embedded defaults live in [lib/license-defaults.mjs](../lib/license-defaults.mjs).

---

## Required env values

Minimum `.env` setup:

```env
KAYX_LICENSE_KEY=YOUR_LICENSE_KEY
KAYX_PRODUCT_ID=YOUR_PRODUCT_NAME
```

You do not need to expose these in `.env` anymore:

- license validation URL
- license API token
- shared secret
- fail-open flag
- license cache TTL

Those values are kept internal so buyers cannot repoint validation to another endpoint.

---

## Embedded defaults

The project currently reads these fixed values from [lib/license-defaults.mjs](../lib/license-defaults.mjs):

```js
LICENSE_VALIDATION_URL=http://999wrld.vps.boxtoplay.com/api/client
LICENSE_API_TOKEN=999wrld.vps.boxtoplay.com
LICENSE_SHARED_SECRET=''
LICENSE_FAIL_OPEN=false
LICENSE_CACHE_TTL_MS=300000
```

If you change the real license server path or token, update that file and redeploy.

---

## How it works

### Startup check

- `npm run dev` runs a license startup validation before Next.js is considered ready
- `npm start` does the same through the production startup script
- if validation fails, startup stops immediately

### Runtime check

- the app validates the license during runtime too
- failed validation sends users to `/licencia`
- protected API access is blocked when the runtime check fails

### Admin monitor

Admins can inspect the current status in:

- `/admin/licencia`

That panel is intended for project operators, not end users. It shows:

- current validation status
- last successful or failed check
- expiration date if returned by the license server
- remaining time if expiration is present
- reason and raw validator message

The status endpoint used by that panel is now admin-only.

---

## Local setup

1. Copy `.env.example` to `.env`
2. Fill `KAYX_LICENSE_KEY`
3. Fill `KAYX_PRODUCT_ID`
4. Run:

```bash
npm install
npm run init-db
npm run dev
```

If startup stops, the terminal banner will show the reason.

---

## Production notes

When deploying:

- set `KAYX_LICENSE_KEY` in the host environment
- set `KAYX_PRODUCT_ID` in the host environment
- make sure the embedded license endpoint is reachable from the deployment
- redeploy after any change to env or license defaults

If the fixed endpoint changes, update [lib/license-defaults.mjs](../lib/license-defaults.mjs) before deploying.

---

## Common failure cases

### App does not boot

Usually one of these:

- `KAYX_LICENSE_KEY` is missing
- `KAYX_PRODUCT_ID` is missing or wrong
- the embedded endpoint is unreachable
- the license key is invalid or expired
- license integrity files were altered or removed

### `/licencia` appears during runtime

Startup passed, but runtime validation failed later.

Check:

- current env values
- connectivity to the embedded license endpoint
- the admin monitor at `/admin/licencia`

### Admin panel shows invalid or expired

Go to `/admin/licencia` and review:

- expiration date
- remaining time
- reason
- validator message

That page is now the canonical operational view for license health.

---

## Related files

- [lib/license.ts](../lib/license.ts)
- [scripts/license-check.mjs](../scripts/license-check.mjs)
- [lib/license-defaults.mjs](../lib/license-defaults.mjs)
- [app/admin/licencia/page.tsx](../app/admin/licencia/page.tsx)
- [app/licencia/page.tsx](../app/licencia/page.tsx)

---

## Rule of thumb

If a buyer or admin can modify the validation endpoint from `.env`, the protection bar is too low.

This project now keeps that part internal on purpose.