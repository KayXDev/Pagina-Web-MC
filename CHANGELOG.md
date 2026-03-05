# 📝 Changelog

## [Unreleased] 🚧

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
