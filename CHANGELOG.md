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

> *🪪 Social identity update: `@username` + display name.*

### ✨ Added

- 🏷️ **User `displayName`** field (editable in Profile Settings).
- 🧭 **Navbar + profile headers** now show `@username` and the visible name.

### 🔧 Changed

- 🔐 **NextAuth session payload** now exposes `username` and `displayName` (keeps `session.user.name` as the username for compatibility).
