# 📝 Changelog

### 2026-03-11 ✅ 🆕 Latest

### ✨ Added

- 💎 **Admin-configurable loyalty economy**:
  - Added global admin controls for points earned per euro, points redeemed per euro, and points converted to store balance per euro.
- 💰 **Loyalty-to-balance conversion**:
  - Users can now convert loyalty points into internal store balance for use in the shop.
- 🛍️ **Store balance support in checkout pricing**:
  - PayPal, Stripe, previews, and post-payment handling now support applying internal balance correctly.

### 🔧 Changed

- 👤 **Navbar user dropdown upgraded**:
  - Clicking the username/user control now opens a dropdown with loyalty info, current store balance, and point conversion tools.
- 🛒 **Balance usage moved out of checkout UI**:
  - Removed the balance conversion and toggle block from the cart page and made the preference come from the navbar user dropdown.
- 🧾 **Profile/admin loyalty payloads expanded**:
  - Profile and admin APIs now expose the loyalty configuration needed by the new UI.

### 🐛 Fixed

- 🧩 **Navbar loyalty dropdown integration**:
  - Repaired the navbar/mobile user controls so the relocated loyalty and balance panel renders correctly and passes production build validation.

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
