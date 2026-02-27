# 📝 Changelog

> *This document tracks **notable** changes (features, fixes, and behavior changes).*  
> Format inspired by **Keep a Changelog**.

**Conventions**

- Entries are ordered newest → oldest.
- Each dated entry uses `YYYY-MM-DD`.
- The most recent entry is marked with **🆕 Latest**.
- The root changelog keeps **only the most recent** dated entry; older entries go to [changelog/archive](changelog/archive) (e.g. `changelog/archive/2026.md`).

## [Unreleased] 🚧

### ✨ Added

- *Nothing yet.*

### 🔧 Changed

- *Nothing yet.*

### 🐛 Fixed

- *Nothing yet.*

---

## 2026-02-27 ✅ 🆕 Latest

> *Day summary: social identity (`@username` + display name), code-based email verification (OTP), presence statuses, admin-managed badges, plus several newsletter/legal/SEO improvements.*

### ✨ Added

- 🏷️ **User `displayName` field** (editable in Profile Settings).
- 🧭 **Navbar + profile headers** show `@username` and the display name.
- 🏷️ **Dynamic badges system** (no hardcoding) with:

  - Admin CRUD.
  - Public API for listing/rendering.
  - Icon upload.

- 🟢🟠⚫ **Presence/status system**:
  - Statuses: `ONLINE` / `BUSY` / `INVISIBLE`.
  - Periodic ping + `lastSeenAt`.
  - Discord-style dot indicator on the avatar (private + public profile).

- ✉️✅ **Email verification via OTP** with “don’t create the account until verified” flow:
  - Registration creates a temporary `PendingUser` (TTL) and sends a code.
  - OTP verification creates the final `User`.

- 🧾 **Improved newsletter**:
  - Localized popup (language) + better copy.
  - Configurable sending schedule.
  - Admin test-send endpoint.

- 🍪 **Cookie consent**:
  - Preferences and “reopen consent” support.
  - Blocks analytics until consent.

- ⚖️ **Legal + i18n**:
  - Redesigned Privacy/Terms + Cookies page.
  - Automatic language detection and legal-page translations.

- 🛡️ **Security docs** and documentation improvements (SECURITY/CHANGELOG).

### 🔧 Changed

- 🔐 **NextAuth**: session payload now exposes `username` and `displayName` (keeps `session.user.name` as `username` for compatibility).
- 🧾 Registration: clearer form separating “Name” (display) and “Username”.
- 🔑 Login: the “resend verification” action only shows when applicable.
- 👤 Profile: removed the textual `Estado: ...` line under `@username` (status dot remains).
- 🔎 SEO: metadata/copy tweaks (including switching default metadata to EN).
- ⏱️ Newsletter cron: several scheduling adjustments (compatibility/frequency).

### 🐛 Fixed

- 🏷️ Badges: icon URLs and Vercel behavior.
- 🏷️ Badges: caching behavior in `/api/badges` on Vercel.
- 🗃️ Mongoose: deprecation fixes and Vercel cron consolidation.

### 🔁 Reverted

- 🎨 “Neon brand” visual redesign (tested and **reverted** the same day; not part of the final changes).
