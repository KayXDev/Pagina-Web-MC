# Setup (Local + Producción)

Guía completa para levantar el proyecto en local, preparar tu `.env`, inicializar la base de datos y entender los servicios opcionales (uploads, pagos, worker de entregas).

---

## 1) Requisitos

- Node.js **18.17+** (recomendado Node 20+)
- npm
- MongoDB (recomendado MongoDB Atlas)

---

## 2) Instalación local (paso a paso)

### 2.1 Instalar dependencias

```bash
npm install
```

### 2.2 Crear el archivo `.env`

```bash
cp .env.example .env
```

Edita `.env` y configura, como mínimo:

- `MONGODB_URI`
- `NEXTAUTH_URL` (local: `http://localhost:3000`)
- `NEXTAUTH_SECRET`

Generar `NEXTAUTH_SECRET` (macOS/Linux):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 2.3 Configurar MongoDB Atlas (si aplica)

Si usas Atlas:

1) Asegúrate de que el usuario/contraseña de tu URI sean correctos.
2) En **Network Access**, agrega tu IP a la whitelist (o temporalmente `0.0.0.0/0` para pruebas).
3) Verifica que el host de la URI sea el correcto (no es `cluster.mongodb.net`, suele ser `cluster0.xxxxx.mongodb.net`).

### 2.4 Inicializar la base de datos (seed)

Este comando crea/siembra contenido y el usuario admin inicial usando `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

```bash
npm run init-db
```

### 2.5 Iniciar el servidor

```bash
npm run dev
```

Abre: http://localhost:3000

---

## 3) Accesos

- Login: `/auth/login`
- Admin panel: `/admin`

Credenciales iniciales (si ejecutaste `npm run init-db`):

- Email: `ADMIN_EMAIL`
- Password: `ADMIN_PASSWORD`

---

## 4) Variables de entorno (resumen)

La referencia completa está en `.env.example`. Aquí va lo esencial.

### 4.1 Requeridas

- `MONGODB_URI`: conexión a MongoDB.
- `NEXTAUTH_URL`: URL base (local: `http://localhost:3000`).
- `NEXTAUTH_SECRET`: secreto fuerte para NextAuth.

### 4.2 Estado del servidor Minecraft

- `MINECRAFT_SERVER_IP` / `MINECRAFT_SERVER_PORT`: status del servidor.
- `MC_ONLINE_MODE`: `true` (online-mode, UUID real) o `false` (offline-mode, UUID offline).

### 4.3 Uploads (imágenes)

En desarrollo puede escribir en `public/uploads/...`.
En producción (especialmente Vercel) el filesystem es efímero: configura un proveedor.

Opciones soportadas (según configuración):

- Cloudinary (recomendado si ya lo usas)
   - Opción A: `CLOUDINARY_URL=...`
   - Opción B: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- Vercel Blob
   - `BLOB_READ_WRITE_TOKEN`

### 4.4 Pagos (opcional)

Si vas a usar tienda/checkout:

- PayPal:
   - `PAYPAL_ENV` (`sandbox` | `live`)
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_CLIENT_SECRET`
- Stripe:
   - `STRIPE_SECRET_KEY`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`

### 4.4.1 Email (Forgot password)

Para que funcione **"¿Has olvidado tu contraseña?"** en producción, configura SMTP:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Si no está configurado, el sistema seguirá respondiendo OK (por seguridad), pero no podrá enviar el email.

### 4.5 Worker de entregas (opcional)

Si usas entregas automáticas in-game:

- `DELIVERY_API_KEY` (secreto fuerte)
- `DELIVERY_MAX_ATTEMPTS` (opcional)

Arranque del worker:

```bash
npm run deliveries:worker
```

---

## 5) Comandos útiles

- Dev: `npm run dev`
- Build: `npm run build`
- Prod local: `npm run build && npm start`
- Linter: `npm run lint`
- Seed DB: `npm run init-db`

---

## 6) Ver y gestionar la base de datos

Recomendado: **MongoDB Compass**

1) Descarga: https://www.mongodb.com/try/download/compass
2) Conecta con tu `MONGODB_URI`.
3) Explora colecciones (por ejemplo: `users`, `products`, `blogposts`, etc.).

Nota: **HeidiSQL no funciona con MongoDB** (es para SQL).

---

## 7) Troubleshooting

### 7.1 MongoDB no conecta

Revisa:

- Password/usuario en `MONGODB_URI`.
- Whitelist de IP en Atlas.
- Que el cluster esté accesible y tu conexión estable.

### 7.2 Login no funciona tras el seed

1) Ejecuta `npm run init-db` de nuevo.
2) Borra caché de Next: `rm -rf .next`
3) Reinicia: `npm run dev`

### 7.3 Error: "Cannot find module 'memory-pager'"

```bash
npm install memory-pager sparse-bitfield
rm -rf .next
npm run dev
```

