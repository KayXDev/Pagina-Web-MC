# 🎮 Página Web de Servidor de Minecraft - MiServidor MC

Una página web completa, moderna y profesional para servidores de Minecraft construida con Next.js 14, TypeScript, MongoDB y NextAuth.

## Demo (Vercel)

- Live: https://999wrldnetwork.vercel.app

[![Preview de la web](https://image.thum.io/get/width/1400/https://999wrldnetwork.vercel.app)](https://999wrldnetwork.vercel.app)

## ✨ Características

### 🌐 Frontend
- ⚡ Next.js 14 con App Router
- 🎨 TailwindCSS para estilos
- 🎭 Framer Motion para animaciones
- 📱 Diseño responsive (móvil, tablet, PC)
- 🌙 Soporte para tema oscuro
- 🎨 Diseño inspirado en Minecraft con paleta profesional

### 🔐 Autenticación
- 🔒 NextAuth para autenticación segura
- 👤 Sistema completo de login/registro
- 🔑 Hash de contraseñas con bcrypt
- 🛡️ Roles de usuario (USER, STAFF, ADMIN)
- 🚫 Sistema de baneo de usuarios

### 💾 Base de Datos
- 🍃 MongoDB con Mongoose
- 📊 Modelos para usuarios, productos, tickets, blog, logs
- 🔄 Caché de conexión optimizado

### 📄 Páginas Públicas
- 🏠 **Home**: Hero section, características, modos de juego, staff, reviews
- 🛒 **Tienda**: Catálogo de productos con categorías
- 📜 **Normas**: Acordeón con normas del servidor y Discord
- 👥 **Staff**: Equipo de administración
- 📰 **Noticias**: Sistema de blog con posts
- 💬 **Soporte**: Sistema de tickets para usuarios
- 👤 **Perfil**: Perfil del usuario con estadísticas

### 🎛️ Panel de Administración
- 📊 **Dashboard**: Estadísticas generales y actividad reciente
- 👨‍👩‍👧‍👦 **Usuarios**: Gestión completa de usuarios, roles, baneos
- 🏪 **Productos**: CRUD completo de productos de la tienda
- 🎫 **Tickets**: Gestión y respuesta de tickets de soporte
- ✍️ **Blog**: Editor de posts con Markdown
- 📈 **Estadísticas**: Métricas del servidor
- 📝 **Logs**: Historial de acciones administrativas
- ⚙️ **Configuración**: Ajustes generales del servidor

### 🎮 Integración Minecraft
- 🔴 Estado del servidor en tiempo real (online/offline)
- 👥 Jugadores conectados
- 🏓 Ping del servidor
- 📋 MOTD y versión
- 👤 Avatares de jugadores

### 🛡️ Seguridad
- ✅ Validación con Zod
- 🔒 Middleware de protección de rutas
- 📝 Logs de acciones administrativas
- 🚫 Protección contra usuarios baneados
- 🔐 Variables de entorno para datos sensibles

## 🚀 Instalación

### Requisitos Previos
- Node.js 18+
- MongoDB Atlas o instancia local de MongoDB
- npm o yarn

### Paso 1: Clonar e Instalar Dependencias

```bash
# Instalar dependencias
npm install
```

### Paso 2: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Edita el archivo `.env` con tus datos:

```env
# MongoDB
MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/minecraft-server

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=tu-secret-key-super-segura-aqui

# Server Info
MINECRAFT_SERVER_IP=play.tuservidor.com
MINECRAFT_SERVER_PORT=25565

# Admin Initial Credentials
ADMIN_EMAIL=admin@tuservidor.com
ADMIN_PASSWORD=changeme123

# Site Info
SITE_NAME="MiServidor MC"
NEXT_PUBLIC_DISCORD_URL=https://discord.gg/tuservidor
NEXT_PUBLIC_TIKTOK_URL=https://tiktok.com/@tuservidor
NEXT_PUBLIC_YOUTUBE_URL=https://youtube.com/@tuservidor
NEXT_PUBLIC_MINECRAFT_SERVER_IP=play.tuservidor.com
```

### Paso 3: Inicializar Base de Datos

Crea el usuario administrador inicial ejecutando el script de inicialización:

```bash
npm run init-db
```

Este script creará:
- ✅ Usuario administrador inicial
- ✅ Productos de ejemplo
- ✅ Posts de ejemplo
- ✅ Configuraciones iniciales

### Paso 4: Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000` y en la consola verás un link público tipo `https://xxxxx.trycloudflare.com` para compartir (si tienes `cloudflared` instalado).

### (Opcional) Compartir un link público (fuera de tu red local)

Si quieres que otras personas entren a tu web sin estar en tu misma red Wi‑Fi/LAN, puedes iniciar el servidor con un túnel que te dará un **URL público**.

Requisito: tener instalado `cloudflared` (Cloudflare Tunnel).

macOS (Homebrew):

```bash
brew install cloudflared
```

1) Instala dependencias (solo la primera vez):

```bash
npm install
```

2) Inicia el servidor y genera el link:

```bash
npm run dev
```

En la consola verás un link tipo `https://xxxxx.trycloudflare.com`. Ese es el que puedes pasar a otras personas.

Notas:
- Debes dejar el proceso corriendo (si cierras la terminal, el link deja de funcionar).
- Si vas a usar login/registro (NextAuth), normalmente tendrás que poner `NEXTAUTH_URL` y `SITE_URL` con ese link y reiniciar el servidor, para que los redirects/cookies funcionen bien.
- Ese link suele cambiar cada vez que lo inicias; si quieres un link fijo, lo ideal es desplegar (por ejemplo Vercel) o usar un túnel con dominio propio.

Si prefieres desarrollo sin túnel (solo red local), usa:

```bash
npm run dev:lan
```

### Paso 5: Build para Producción

```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
minecraft-server-web/
├── app/
│   ├── admin/              # Panel de administración
│   │   ├── users/
│   │   ├── products/
│   │   ├── tickets/
│   │   ├── blog/
│   │   ├── stats/
│   │   ├── logs/
│   │   └── settings/
│   ├── api/                # API Routes
│   │   ├── auth/
│   │   ├── admin/
│   │   ├── products/
│   │   ├── tickets/
│   │   ├── blog/
│   │   └── server/
│   ├── auth/               # Páginas de autenticación
│   ├── tienda/             # Tienda
│   ├── normas/             # Normas
│   ├── staff/              # Staff
│   ├── noticias/           # Blog/Noticias
│   ├── soporte/            # Sistema de tickets
│   ├── perfil/             # Perfil de usuario
│   ├── layout.tsx
│   ├── page.tsx            # Home
│   └── globals.css
├── components/             # Componentes reutilizables
│   ├── ui/
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── ServerStatusWidget.tsx
│   ├── PageHeader.tsx
│   └── AnimatedSection.tsx
├── lib/                    # Utilidades y configuración
│   ├── mongodb.ts
│   ├── auth.ts
│   ├── session.ts
│   ├── validations.ts
│   ├── minecraft.ts
│   └── utils.ts
├── models/                 # Modelos de MongoDB
│   ├── User.ts
│   ├── Product.ts
│   ├── Ticket.ts
│   ├── TicketReply.ts
│   ├── BlogPost.ts
│   ├── AdminLog.ts
│   └── Settings.ts
├── types/                  # Tipos de TypeScript
├── middleware.ts           # Middleware de protección
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

## 🎯 Uso

### Acceso Inicial

1. **Usuario Regular**: Regístrate en `/auth/register`
2. **Administrador**: Usa las credenciales del `.env` (por defecto: admin@tuservidor.com / changeme123)

### Panel de Administración

Accede al panel de administración en `/admin` con una cuenta de administrador.

Funcionalidades disponibles:
- Gestionar usuarios y roles
- Crear y editar productos de la tienda
- Responder tickets de soporte
- Publicar noticias y actualizaciones
- Ver estadísticas y logs
- Configurar ajustes del servidor

## 🎨 Personalización

### Colores

Los colores temáticos de Minecraft se pueden personalizar en `tailwind.config.ts`:

```typescript
minecraft: {
  grass: '#7BC043',
  dirt: '#8B6F47',
  stone: '#7F7F7F',
  obsidian: '#1A0033',
  diamond: '#47D1E8',
  gold: '#F9E547',
  redstone: '#C62424',
}
```

### Contenido

Personaliza el contenido editando:
- **Home**: `app/page.tsx`
- **Normas**: `app/normas/page.tsx`
- **Staff**: `app/staff/page.tsx`

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo
npm run build        # Build de producción
npm start            # Servidor de producción
npm run lint         # Linter
npm run init-db      # Inicializar base de datos
```

## 📦 Dependencias Principales

- **Next.js 14**: Framework React
- **TypeScript**: Tipado estático
- **MongoDB + Mongoose**: Base de datos
- **NextAuth**: Autenticación
- **TailwindCSS**: Estilos
- **Framer Motion**: Animaciones
- **Zod**: Validación de esquemas
- **Bcryptjs**: Hash de contraseñas
- **React Icons**: Iconos
- **React Toastify**: Notificaciones
- **React Markdown**: Renderizado de Markdown
- **Axios**: Peticiones HTTP

## 🚀 Deploy

### Vercel (Recomendado)

1. Sube el proyecto a GitHub
2. Conecta tu repositorio en Vercel
3. Añade las variables de entorno
4. Deploy automático

### VPS (Ubuntu/Debian)

```bash
# Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clonar y configurar
git clone <tu-repo>
cd minecraft-server-web
npm install
npm run build

# Usar PM2 para mantener el proceso
npm install -g pm2
pm2 start npm --name "minecraft-web" -- start
pm2 save
pm2 startup
```

## 📝 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Soporte

Si tienes problemas o preguntas:
- 📖 Lee la documentación
- 🐛 Abre un issue en GitHub
- 💬 Únete a nuestro Discord

## ⭐ Agradecimientos

- Minecraft por la inspiración
- Comunidad de Next.js
- Todos los contribuidores

---

**¡Disfruta de tu servidor de Minecraft profesional!** 🎮✨
