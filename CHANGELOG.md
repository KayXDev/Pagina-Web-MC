# 📝 Changelog

> *This document tracks **notable** changes (features, fixes, and behavior changes).*  
> Format inspired by **Keep a Changelog**.

**Conventions**

- Entries are ordered newest → oldest.
- Each dated entry uses `YYYY-MM-DD`.
- The most recent entry is marked with **🆕 Latest**.
- Older entries can be moved into [changelog/archive](changelog/archive) (e.g. `changelog/archive/2026.md`) to keep this file short.

## [Unreleased] 🚧

### ✨ Added

- **Project documentation** improvements (README sections, Security Policy, Changelog).

### 🔧 Changed

- *Nothing yet.*

### 🐛 Fixed

- *Nothing yet.*

---


## 2026-02-27 ✅ 🆕 Latest

> *🌍 i18n + legal pages polish: auto language + improved layout + header spacing.*

### ✨ Added

- 🗣️ **Auto language detection** (sets `lang` from browser `Accept-Language` when missing).
- 🌐 **ES/EN content** for `/cookies`, `/privacidad`, and `/terminos`.

### 🔧 Changed

- 📐 **Header spacing**: legal pages now include top padding so titles don’t sit under the navbar.
- 🧾 **Legal page design** refreshed again (clean stacked sections).


## 2026-02-27 ✅

> *✨ Legal pages refresh: improved design + new Cookies page (no more 404).* 

### ✨ Added

- 🍪 **`/cookies`** page with a clear Cookies Policy + a button to change preferences.

### 🔧 Changed

- 🧾 **`/privacidad`** redesigned: better layout, table of contents, anchored sections, and a cleaner “last updated”.
- 📜 **`/terminos`** redesigned: same improvements for readability and structure.


## 2026-02-27 ✅

> *Cookie preferences update (allow changing consent later).* 

### ✨ Added

- 🔁 **Cookie preferences button** on `/privacidad` to let users change their choice.

### 🔧 Changed

- 🍪 **Consent banner** can be re-opened when consent is cleared.


## 2026-02-27 ✅

> *Cookies/consent update (analytics gated by user choice).* 

### ✨ Added

- 📊 **Consent-gated analytics** component to load Vercel Analytics only after consent.

### 🔧 Changed

- 🍪 **Cookie consent flow** now broadcasts an event so optional features can enable immediately after “Accept”.


## 2026-02-27 ✅

> *Stability + operations update (Vercel + background jobs) + docs polish.*

### ✨ Added

- 🧾 **Security Policy**: vulnerability reporting flow in [SECURITY.md](SECURITY.md).
- 📝 **Changelog**: project change tracking in [CHANGELOG.md](CHANGELOG.md).
- 🕒 **Daily cron aggregator** (`/api/cron/daily`) to run multiple scheduled tasks under Vercel plan limitations.

### 🔧 Changed

- ⏱️ **Cron scheduling** consolidated to a **single daily** cron in Vercel config.
- 🔐 **Cron authorization** accepts Vercel Cron (`user-agent: vercel-cron/1.0`) and still supports manual triggering via secret.

### 🐛 Fixed

- 🧠 **Mongoose warning**: replaced deprecated `{ new: true }` with `returnDocument: 'after'` for update operations.
- 🌐 **Cron runtime consistency**: ensured cron routes run on the Node.js runtime.
- 🛰️ **Minecraft status check**: removed Axios usage for the status call to reduce Node deprecation warnings and keep timeouts from producing noisy logs.

### 📌 Notes

- 📰 The app includes **News/Blog**, **Forum**, **Profiles**, **Store**, **Tickets/Support**, **Notifications**, and a full **Admin panel** (see [README.md](README.md)).
