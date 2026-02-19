# 🚀 Guía Rápida de Configuración

## Paso 1: Instalar Dependencias

```bash
npm install
```

## Paso 2: Configurar MongoDB

Tu archivo `.env` ya tiene la conexión configurada:

```env
MONGODB_URI=mongodb+srv://ahernandezk08:Loltroll98@cluster0.ekuwz.mongodb.net/?appName=Cluster0
```

## Paso 3: Inicializar Base de Datos

Ejecuta este comando para crear:
- ✅ Usuario administrador (Email: ahernandezk08@gmail.com, Password: Loltroll98)  
- ✅ 10 productos en la tienda
- ✅ 5 noticias de ejemplo
- ✅ Configuraciones iniciales

```bash
npm run init-db
```

## Paso 4: Iniciar el Servidor

```bash
npm run dev
```

Luego ve a: http://localhost:3000

## 🔐 Login

- **Email**: ahernandezk08@gmail.com
- **Password**: Loltroll98

## 📊 Ver Base de Datos

Usa **MongoDB Compass** (cliente visual oficial para MongoDB):

1. Descarga: https://www.mongodb.com/try/download/compass
2. Conecta con tu URI:
   ```
   mongodb+srv://ahernandezk08:Loltroll98@cluster0.ekuwz.mongodb.net/?appName=Cluster0
   ```
3. Explora las colecciones: users, products, blogposts, etc.

## ⚠️ Nota sobre HeidiSQL

HeidiSQL solo funciona con bases de datos SQL (MySQL, PostgreSQL, etc.).  
MongoDB es NoSQL, por lo que **NO es compatible** con HeidiSQL.

Para MongoDB debes usar:
- **MongoDB Compass** (Recomendado - Interfaz gráfica oficial)
- **MongoDB Atlas Dashboard** (Navegador web)
- **mongosh** (Terminal/CLI)

## 🆘 Solución de Problemas

### Error: "Cannot find module 'memory-pager'"

```bash
npm install memory-pager sparse-bitfield
rm -rf .next
npm run dev
```

### Login no funciona

1. Ejecuta: `npm run init-db`
2. Limpia caché: `rm -rf .next`  
3. Reinicia: `npm run dev`
4. Intenta login con credenciales arriba

### MongoDB no conecta

Verifica que:
- Tu contraseña en MONGODB_URI sea correcta
- Tu IP esté en la whitelist de MongoDB Atlas
- Internet esté activo
