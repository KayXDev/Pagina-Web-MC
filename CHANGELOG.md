# 📝 Changelog

### 2026-03-08 ✅ 🆕 Latest

### ✨ Added

- 🔐 **Mandatory KayX license activation flow**:
  - App startup now validates the project license before `npm run dev` and `npm start` continue.
  - The website enforces remote REST validation against the KayX/Drako licensing server.
- 🖥️ **Styled startup license banner**:
  - Development startup now shows a polished terminal panel with license status, Discord ID, and cleaner error summaries.
- 🎨 **Redesigned license-required page**:
  - New premium-looking page for invalid or missing licenses.
  - Includes setup guidance, status details, Discord support CTA, and KayX `.env` example.
- 📚 **Dedicated license documentation**:
  - Added a separate guide in `docs/license-system.md` with full setup, Discord Developer Portal steps, deployment, and troubleshooting.
- 🧩 **License integrity guard**:
  - Startup now fails if required license files are missing.
  - Runtime now depends on a dedicated license seal file.

### 🔧 Changed

- 📘 **README licensing notice moved to the top**:
  - Replaced the oversized setup block with a short summary and a link to the dedicated license docs.
  - Documented the mandatory KayX variables using placeholders only.
- 🌐 **License support messaging**:
  - Invalid-license flows now direct users to Discord support in English.
- 🔌 **REST-only license validation**:
  - The project now uses the KayX/Drako REST API flow and matches the `/api/client` request format.

### 🐛 Fixed

- 🧾 **Noisy startup errors**:
  - Removed large Axios stack dumps for common invalid-license cases.
  - Replaced raw status codes like `INVALID_LICENSEKEY` with readable messages such as “Invalid license key”.

### 2026-03-06 ✅ 🆕 Latest

### ✨ Added

- 📘 **Detailed Quick Find guide in README**:
  - Expanded “Quick Find (Where to Change Things)” section with a full route/file map.
  - Added public pages map, admin pages map, and i18n key-prefix map.
  - Added recommended translation workflow and audit command examples.

### 🔧 Changed

- 🌐 **README translation consistency**:
  - Updated the new Quick Find guide to English to match the rest of the README.
- 🧩 **Admin i18n coverage improved**:
  - `app/admin/coupons/page.tsx` now uses language-aware labels and toasts via `useClientLang()`.
  - `app/admin/referrals/page.tsx` now uses language-aware labels and toasts via `useClientLang()`.

### 🐛 Fixed

- 🗣️ **Language switch mismatch in admin sections**:
  - Resolved hardcoded text in Coupons and Referrals pages that did not follow the selected site language.

### 2026-03-05 ✅ 🆕 Latest 🚧

### ✨ Added

- 🎫 **Discord webhook for new support tickets**:
  - Configurable from admin tickets page.
  - Dedicated test-send button with selectable priority.
  - Rich English embed formatting with markdown-style structure.
- 🧪 **Admin test endpoint** for tickets webhook:
  - `POST /api/admin/tickets/webhook-test`
  - Writes an admin log entry after successful test send.
- 🔔 **Real-time notification stream (SSE)**:
  - New endpoint `GET /api/notifications/stream`.
  - Live unread counter updates without manual refresh.
- 🛒 **Shop UX additions**:
  - Price min/max filters.
  - Price sorting (default, low→high, high→low).
  - Wishlist (heart toggle) persisted locally.
  - “Wishlist only” filter.
- 🎟️ **Coupons system**:
  - New coupon model and admin CRUD management page/API.
  - Discount preview endpoint for cart (`/api/shop/discounts/preview`).
  - Coupon application integrated into checkout pricing.
  - Optional product-specific scope at creation time (or general scope for all products).
- 👥 **Referral system**:
  - Referral profiles/events models and admin management page/API.
  - Referral code field in user registration flow.
  - Referred-by metadata persisted from pending registration to final user account.
  - Reward/discount processing hook after paid orders.

### 🔧 Changed

- 🧾 **Shop pricing flow refactor**:
  - Shared pricing engine `lib/shopPricing.ts` now used by manual checkout, Stripe create, and PayPal create routes.
  - Orders persist subtotal, coupon metadata, and referral metadata in `ShopOrder`.
  - Referral discount is now applied automatically from account referral metadata (no manual checkout referral input).
- 👥 **Referral controls updated**:
  - Referral discount percentage can now be configured from the admin referrals panel.
  - Referral discount usage is limited to one use per referred user.
- 🎟️ **Coupon scope rules updated**:
  - Coupons can be created as general (all products) or tied to a single specific product.
  - Product-scoped coupons only apply when that product is present in cart.
- 💳 **Payment success handling**:
  - Incentive application (`applyOrderIncentives`) now runs in Stripe confirm/webhook and PayPal capture flows.
- 🧭 **Admin navigation**:
  - Added direct links for Coupons and Referrals.
- 🖼️ **UI polish updates**:
  - Removed icon boxed frame style from shared `PageHeader`.
  - Redesigned navbar cart dropdown/panel visuals for desktop and mobile.
  - Compact Minecraft account summary card in shop.

### 🐛 Fixed

- 📡 **Notification freshness gap**:
  - Replaced refresh-dependent behavior with live stream updates to reduce stale unread counts.
- 🧮 **Checkout pricing drift risk**:
  - Consolidated duplicated provider-specific price logic into one shared calculator to avoid inconsistent totals across payment providers.

---

## 2026-02-27 ✅

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
