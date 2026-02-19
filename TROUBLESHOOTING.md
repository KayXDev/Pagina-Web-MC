# 🔧 Solución de Problemas de Login

## Problema: "El login no funciona / No inicia sesión"

### Diagnóstico Rápido

Ejecuta estos comandos en orden:

```bash
# 1. Limpia la caché de Next.js
rm -rf .next

# 2. Reinstala dependencias si es necesario
npm install

# 3. Verifica que las variables de entorno estén correctas
cat .env | grep -E "MONGODB_URI|NEXTAUTH"

# 4. Inicia el servidor
npm run dev
```

### Solución Paso a Paso

#### 1. Verifica MongoDB

Abre el archivo `.env` y asegúrate de que:
- MONGODB_URI tiene la contraseña correcta (sin `<` `>`)
- La URL de MongoDB es válida

```env
# ❌ MAL
MONGODB_URI=mongodb+srv://user:<db_password>@cluster...

# ✅ BIEN  
MONGODB_URI=mongodb+srv://user:TuPasswordReal123@cluster...
```

#### 2. Genera un NEXTAUTH_SECRET fuerte

El NEXTAUTH_SECRET debe ser único y aleatorio:

```bash
# Genera uno nuevo (copia el resultado al .env)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Pega el resultado en tu .env:
```env
NEXTAUTH_SECRET=el-string-generado-aqui
```

#### 3. Crea el usuario administrador

```bash
npm run init-db
```

Esto creará el usuario admin con:
- **Email**: ahernandezk08@gmail.com
- **Password**: Loltroll98

#### 4. Verifica la Consola del Navegador

Abre el navegador en modo desarrollador (F12) y busca errores en:
- **Console**: Errores de JavaScript
- **Network**: Errores en peticiones a `/api/auth`

### Errores Comunes

#### Error: "Unable to find next-auth secret"

**Causa**: NEXTAUTH_SECRET no está definido o es inválido

**Solución**:
```env
# En .env, asegúrate de tener:
NEXTAUTH_SECRET=un-secreto-super-largo-y-aleatorio-mínimo-32-caracteres
```

#### Error: "Cannot find module 'memory-pager'"

**Causa**: Falta dependencia de MongoDB

**Solución**:
```bash
npm install memory-pager sparse-bitfield
```

#### Error: "MongoServerError: Authentication failed"

**Causa**: Contraseña incorrecta en MONGODB_URI

**Solución**:
1. Ve a MongoDB Atlas (mongodb.com)
2. Database Access → Crea nueva contraseña para el usuario
3. Actualiza MONGODB_URI en .env con la nueva contraseña

#### Error: "Network error / Cannot connect"

**Causa**: IP no está en whitelist de MongoDB Atlas

**Solución**:
1. Ve a MongoDB Atlas
2. Network Access → Add IP Address
3. Agrega tu IP actual o usa `0.0.0.0/0` (permite todas las IPs)

### Testing del Login

1. Ve a: http://localhost:3000/auth/login
2. Ingresa:
   - Email: `ahernandezk08@gmail.com`
   - Password: `Loltroll98`
3. Click en "Iniciar Sesión"

**Resultado Esperado**: Redirección a la página principal con tu usuario en la navbar

**Si falla**: 
- Revisa Console del navegador (F12)
- Revisa terminal donde corre `npm run dev`
- Busca el mensaje de error específico

### Verificar Usuario en Base de Datos

Si tienes MongoDB Compass instalado:

1. Conecta con tu MONGODB_URI
2. Ve a la base de datos
3. Busca la colección `users`
4. Debe existir un usuario con email `ahernandezk08@gmail.com`

### Crear Usuario Manualmente

Si el script init-db no funciona, puedes crear un usuario visitando:

http://localhost:3000/auth/register

Y regístrate con:
- Username: Admin
- Email: admin@tuservidor.com
- Password: (tu contraseña)

Luego necesitarás cambiar el rol a ADMIN en la base de datos.

### Aún no Funciona?

Si después de seguir todos estos pasos el login aún no funciona:

1. Comparte el mensaje de error exacto de la consola
2. Verifica que todas las dependencias estén instaladas: `npm list next-auth bcryptjs mongoose`
3. Intenta con otro navegador (Chrome/Firefox)
4. Limpia cookies y caché del navegador

## Contacto

Si necesitas ayuda adicional, comparte:
- Mensaje de error exacto
- Versión de Node.js: `node -v`
- Sistema operativo
- Captura de console (F12)
