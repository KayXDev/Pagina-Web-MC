# 📝 Changelog

### 2026-03-10 ✅ 🆕 Latest

### 🔧 Changed

- 🧭 **Admin panel visual system redesigned**:
  - Rebuilt the shared admin shell with a calmer glass layout, cleaner spacing, softer contrasts, and a more modern navigation hierarchy.
  - Refreshed the shared admin section banner and dashboard cards so the panel feels more fluid and less saturated across desktop and mobile.
  - Simplified the admin topbar and restored the missing admin CSS hooks after a globals stylesheet regression, including a new blue-cyan scrollbar and a more visible sticky header surface.

- 💎 **Navbar pill movement now follows the real selected category**:
  - Kept the existing desktop liquid-glass pill style.
  - Removed the early click-ahead behavior so the pill now moves when the route actually changes.

- 📊 **Project stats script expanded**:
  - Added separate code-only totals to `scripts/project-stats.mjs`.
  - The stats output now shows counted code files, total lines of code, non-empty lines of code, and a final total summary line.

### 2026-03-09

### ✨ Added

- 🛡️ **Admin-only license monitoring panel**:
  - Added a dedicated project license page at `/admin/licencia`.
  - Added a protected admin API to inspect the live license status without exposing it to normal users.
- 🎁 **Loyalty admin tooling**:
  - Added a full loyalty management page at `/admin/loyalty`.
  - Added admin API support to inspect balances, review recent loyalty activity, adjust totals, and send points manually.
- 🧩 **Shared admin section banner system**:
  - Added a reusable modern banner component for admin sections.
  - Rolled route-aware banner metadata into the admin layout so sections can show consistent headers.

### 🔧 Changed

- 💎 **Navbar liquid-glass behavior refined**:
  - The desktop active pill now reacts directly on click and morphs with a more directional liquid-glass motion.
  - Highlight movement and pill deformation were tuned to feel less rigid during category changes.
- 🛒 **Cart and checkout flow redesigned**:
  - Rebuilt the cart layout into clearer product, perks, verification, and checkout blocks.
  - Added loyalty redemption and loyalty earning preview into the pricing flow across preview and payment providers.
- 🔐 **License flow centralized for operators**:
  - Moved operational license review into the admin panel and removed the user-facing profile license panel.
  - Updated public license messaging and docs to reflect embedded validation defaults and the new admin monitor.
- 📊 **Admin operational views expanded**:
  - Dashboard now highlights ticket SLA issues and links directly to the project license panel.
  - Logs view was rebuilt into a more readable activity feed with filters and summary cards.

### 🐛 Fixed

- ⏳ **Real license expiry visibility**:
  - License expiry and remaining time now read from the embedded Mongo-backed license metadata flow instead of relying only on validator payload fields.
- 🧮 **Build validation issue in stored license lookup**:
  - Fixed the typed collection access in the stored license metadata helper so the production build passes cleanly again.

### 2026-03-09

### ✨ Added

- 📘 **Release-ready documentation pass**:
  - Added polished setup, troubleshooting, and license documentation aligned with the current project structure.
  - Kept the main documentation flow connected across README, setup, troubleshooting, and release notes.

### 🔧 Changed

- 🧾 **Documentation presentation refreshed**:
  - Restored the original README style and updated companion docs to match its visual tone.
  - Simplified the license guide to focus on the parts that matter most during setup and deployment.
- 📦 **Release version bump**:
  - Project version is now `1.0.1`.

### 🐛 Fixed

- 🗂️ **Docs consistency issues**:
  - Improved alignment between setup instructions, troubleshooting guidance, and the mandatory KayX license flow.

### 2026-03-08 ✅ 🆕 Latest

### ✨ Added

- 🔐 **Mandatory KayX license activation flow**:
  - App startup now validates the project license before `npm run dev` and `npm start` continue.
  - The website enforces remote REST validation against the KayX licensing server.
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
  - The project now uses the KayX REST API flow and matches the `/api/client` request format.

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
