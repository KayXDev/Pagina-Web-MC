# Admin Redesign — Spec (Implementado)

Este documento describe el rediseño **ya implementado** del panel de administración (Next.js App Router + Tailwind) y sirve como guía para mantener consistencia al seguir rediseñando páginas.

## Objetivo
- Reducir “ruido” visual y densidad del admin.
- Alinear todas las páginas a un patrón **SaaS moderno/minimal**.
- Mantener **toda la lógica, endpoints y acciones** existentes (solo UI/estructura).
- Mantener soporte **Light + Dark** usando `dark:` (sin romper el look dark actual).

## Restricciones
- No cambiar endpoints, payloads, acciones server/client, ni reglas de autorización.
- No agregar nuevas páginas ni flujos (solo reorganización/estética).
- Usar componentes existentes: `Card`, `Button`, `Input`, `Select`, `Textarea`, `Badge`.

## Sistema visual (patrones)
### Contenedores
- Secciones principales con `space-y-6`.
- Encabezado de página en `Card` con `rounded-2xl` y:
  - Light: fondo blanco + borde gris (`border border-gray-200 bg-white`).
  - Dark: panel translúcido (`dark:border-white/10 dark:bg-gray-950/25`).
- Titulares con jerarquía clara (`text-2xl md:text-3xl font-bold`).
- Subtítulo corto en `text-gray-600 dark:text-gray-400`.

### Listados (estándar)
- **Móvil:** cards compactas (stack vertical) para legibilidad.
- **Desktop (xl):** tabla tipo “SaaS” con:
  - Header sticky visual (fila de columnas con `text-xs` + separador).
  - Rows con `divide-y`.
  - Acciones alineadas a la derecha.

### Estados
- Loading: skeleton/shimmer coherente con la densidad del listado.
- Empty: `Card` o bloque con copy corto y CTA cuando aplica.

### Feedback
- `react-toastify` para éxito/error (sin cambiar mensajes ni claves i18n existentes).

---

## Layout global (Admin Shell)
**Archivo:** `app/admin/layout.tsx`
- Sidebar + contenido con padding/espaciado consistente.
- Activo/hover con contraste correcto en light y `dark:` equivalente.

---

## Especificación por página

### Dashboard
**Archivo:** `app/admin/page.tsx`
- Objetivo: bajar la carga visual y clarificar “qué mirar primero”.
- Estructura:
  - Header con título + acciones rápidas.
  - Cards/KPIs con spacing amplio.
  - Secciones agrupadas por intención (estado/actividad/atajos).

### Vote
**Archivo:** `app/vote/page.tsx`
- Objetivo: que deje de verse “básico”; UI moderna sin cambiar lógica.
- Estructura:
  - Header claro.
  - Tarjetas/estados bien jerarquizados.
  - CTA principal destacado.

### Users
**Archivo:** `app/admin/users/page.tsx`
- Objetivo: gestión completa de usuarios con alta densidad pero legible.
- Responsive:
  - Móvil: cards con campos clave + menú/acciones.
  - Desktop (xl): tabla con columnas estables.
- Mantiene acciones: ban/unban, verify/unverify (OWNER), tags (OWNER), delete, cambio de rol, menú de 3 puntos.
- Estados:
  - Skeleton para tabla.
  - Empty state con copy simple.

### Products
**Archivo:** `app/admin/products/page.tsx`
- Objetivo: CRUD de productos consistente con el sistema.
- Responsive:
  - Móvil: cards.
  - Desktop (xl): tabla.
- Estados:
  - Loading skeleton.
  - Empty card.
- Nota de UI:
  - Categorías se muestran con label de lectura (`getCategoryLabel`) sin tocar datos.

### Tickets
**Archivo:** `app/admin/tickets/page.tsx`
- Objetivo: mantener patrón “inbox + detalle” pero con styling nuevo.
- Cambios de UI:
  - Cards con borde/fondo correcto en light.
  - Skeleton tipo lista.
  - Indicador visual por status (dot).
- Mantiene: tabs, búsqueda, refresh, chat, close/status/priority/reply.

### Postulaciones
**Archivo:** `app/admin/postulaciones/page.tsx`
- Objetivo: gestión de aplicaciones con lectura rápida.
- Responsive:
  - Móvil: cards.
  - Desktop (xl): tabla.
- Mantiene: modal detalle, accept/reject, open/close, link a chat cuando aplica.
- Nota: se corrigió header i18n para usar una key existente.

### Settings (Mantenimiento)
**Archivo:** `app/admin/settings/page.tsx`
- Objetivo: panel de mantenimiento sobrio y consistente.
- Cambios:
  - Loading skeleton.
  - Cards y selección de rutas con contraste en light/dark.

### Permisos
**Archivo:** `app/admin/permisos/page.tsx`
- Objetivo: asignación de permisos clara, sin fricción.
- Cambios:
  - Loading/empty consistente.
  - Lista de admins con “pill/selection” más legible.
- Mantiene: `SECTION_KEYS`, toggles y guardado.

### Foro
**Archivo:** `app/admin/foro/page.tsx`
- Objetivo: moderación/listado simple tipo tabla.
- Estructura:
  - Header con CTA “Reload”.
  - Búsqueda + selector de categoría.
  - Tabla con columnas (post/autor/replies/likes/views/acciones) y empty state.

### Blog
**Archivo:** `app/admin/blog/page.tsx`
- Objetivo: CRUD de posts con modal de edición/creación.
- Estructura:
  - Header + CTA “Nuevo”.
  - Modal (form) con preview de imagen, validaciones mínimas, publish toggle.
  - Listado por cards con acciones (edit/delete).
- Nota: usa `<img>` para preview; el lint sugiere `next/image` (pendiente si se decide).

### Logs
**Archivo:** `app/admin/logs/page.tsx`
- Objetivo: auditoría con búsqueda y detalles expandibles.
- Estructura:
  - Header con contador total y refresh.
  - (OWNER) Card de configuración webhook.
  - Search + contadores por tipo (CREATE/UPDATE/DELETE/Other).
  - Tabla responsive con botón “ver detalles” por fila.

---

## Guía para páginas restantes
- Reutilizar el patrón: `Header Card` → `Controls` → `List (cards móvil / tabla xl)` → `Skeleton/Empty`.
- Evitar nuevas paletas/sombras; usar las mismas clases base (bordes grises en light, `white/10` + `gray-950/25` en dark).
- Mantener acciones y endpoints intactos: cualquier mejora debe ser puramente visual.
