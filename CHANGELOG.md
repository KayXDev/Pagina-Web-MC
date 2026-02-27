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

> *Resumen del día: identidad social (`@username` + nombre visible), verificación por código (OTP), estados de presencia, sistema de badges administrable y varias mejoras de newsletter/legal/SEO.*

### ✨ Added

- 🏷️ **Campo `displayName`** para usuario (editable en Ajustes de perfil).
- 🧭 **Navbar + cabeceras de perfil** muestran `@username` y el nombre visible.
- 🏷️ **Sistema de badges dinámico** (sin hardcode) con:

  - CRUD en admin.
  - API pública para listar/mostrar.
  - Subida de iconos.

- 🟢🟠⚫ **Sistema de presencia/estado**:
  - Estados: `ONLINE` / `BUSY` / `INVISIBLE`.
  - Ping periódico + `lastSeenAt`.
  - Indicador tipo Discord (bolita) sobre el avatar (en perfil propio y público).

- ✉️✅ **Verificación de email por código (OTP)** con flujo “sin crear cuenta hasta verificar”:
  - Registro crea `PendingUser` temporal (TTL) y envía código.
  - Verificación por código crea el `User` definitivo.

- 🧾 **Newsletter mejorada**:
  - Popup localizado (idioma) y copy mejorado.
  - Programación configurable del envío.
  - Endpoint de test-send en admin.

- 🍪 **Consentimiento de cookies**:
  - Preferencias/reapertura de consentimiento.
  - Bloqueo de analítica hasta consentimiento.

- ⚖️ **Legal e i18n**:
  - Rediseño de Privacidad/Términos + página de Cookies.
  - Detección automática de idioma y traducción de legales.

- 🛡️ **Documentación de seguridad** y mejoras de documentación (SECURITY/CHANGELOG).

### 🔧 Changed

- 🔐 **NextAuth**: el payload de sesión expone `username` y `displayName` (mantiene `session.user.name` como `username` por compatibilidad).
- 🧾 Registro: formulario más claro separando “Nombre” (display) y “Nombre de usuario”.
- 🔑 Login: el botón de reenvío de verificación se muestra solo cuando aplica.
- 👤 Perfil: se elimina la línea textual `Estado: ...` bajo el `@username` (se mantiene la bolita de estado).
- 🔎 SEO: ajustes en metadata/copy (incluido cambio de defaults a EN en metadatos).
- ⏱️ Newsletter cron: varios ajustes a la programación (compatibilidad y frecuencia).

### 🐛 Fixed

- 🏷️ Badges: URLs de iconos y comportamiento en Vercel.
- 🏷️ Badges: caché en `/api/badges` en Vercel.
- 🗃️ Mongoose: ajustes por deprecations y consolidación de cron en Vercel.

### 🔁 Reverted

- 🎨 Rediseño visual “neon brand” (se probó y **se revirtió** el mismo día; no queda como cambio final).
