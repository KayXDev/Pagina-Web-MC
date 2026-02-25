/**
 * Script de Inicialización de Base de Datos
 * 
 * Este script inicializa la base de datos con:
 * - Usuario administrador inicial
 * - Productos de ejemplo
 * - Posts de ejemplo
 * - Configuraciones básicas
 * 
 * Uso: node scripts/init-db.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Conectar a MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

// Definir esquemas directamente
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'STAFF', 'ADMIN', 'OWNER'], default: 'USER' },
  tags: { type: [String], default: [] },
  avatar: String,
  isBanned: { type: Boolean, default: false },
  bannedReason: String,
  bannedAt: Date,
  lastLogin: Date,
  createdAt: { type: Date, default: Date.now },
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, enum: ['RANK', 'BUNDLES', 'CURRENCY', 'KEYS', 'SPECIAL'], required: true },
  features: [String],
  stock: Number,
  isActive: { type: Boolean, default: true },
  isUnlimited: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const BlogPostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  excerpt: String,
  author: { type: String, required: true },
  authorId: { type: String, required: true },
  coverImage: String,
  tags: [String],
  isPublished: { type: Boolean, default: false },
  publishedAt: Date,
  views: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  description: String,
  updatedAt: { type: Date, default: Date.now },
});

// Crear usuario admin
const createAdminUser = async () => {
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  
  try {
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    
    if (existingAdmin) {
      console.log('ℹ️  Ya existe un usuario administrador');
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(
      process.env.ADMIN_PASSWORD || 'changeme123',
      12
    );

    const admin = await User.create({
      username: 'Admin',
      email: process.env.ADMIN_EMAIL || 'admin@tuservidor.com',
      password: hashedPassword,
      role: 'ADMIN',
    });

    console.log('✅ Usuario administrador creado');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${process.env.ADMIN_PASSWORD || 'changeme123'}`);
    console.log('   ⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
    
    return admin;
  } catch (error) {
    console.error('❌ Error al crear administrador:', error);
  }
};

// Crear productos de ejemplo
const createSampleProducts = async () => {
  const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);
  
  try {
    const count = await Product.countDocuments();
    if (count > 0) {
      console.log('ℹ️  Ya existen productos en la base de datos');
      return;
    }

    const products = [
      {
        name: 'Rango VIP',
        description: 'Acceso a comandos especiales y beneficios exclusivos para jugadores VIP',
        price: 9.99,
        category: 'RANK',
        features: [
          'Kit VIP cada 24h con items exclusivos',
          'Acceso al comando /fly en el lobby',
          'Prefix [VIP] especial en el chat',
          '2 Homes adicionales',
          'Acceso a warps VIP',
        ],
        isActive: true,
        isUnlimited: true,
        order: 1,
      },
      {
        name: 'Rango VIP+',
        description: 'Todos los beneficios VIP y muchos más. El rango más popular del servidor',
        price: 19.99,
        category: 'RANK',
        features: [
          'Todo lo de VIP incluido',
          'Kit VIP+ cada 12h con items épicos',
          'Acceso a /god en zonas seguras',
          '5 Homes adicionales',
          'Acceso a warps especiales VIP+',
          'Mascota cosmética exclusiva',
          'Prioridad en el servidor',
        ],
        isActive: true,
        isUnlimited: true,
        order: 2,
      },
      {
        name: 'Rango MVP',
        description: 'El rango definitivo con acceso a todo lo que el servidor ofrece',
        price: 34.99,
        category: 'RANK',
        features: [
          'Todo lo de VIP y VIP+ incluido',
          'Kit MVP cada 6h con items legendarios',
          'Acceso a /fly en todas partes',
          '10 Homes adicionales',
          'Particle effects exclusivos',
          'Chat color y formato personalizado',
          'Acceso a servidor de pruebas',
          'Role exclusivo en Discord',
        ],
        isActive: true,
        isUnlimited: true,
        order: 3,
      },
      {
        name: 'Pack Starter',
        description: 'Pack inicial perfecto para empezar con ventaja en el servidor',
        price: 4.99,
        category: 'BUNDLES',
        features: [
          'Set completo de herramientas de diamante',
          'Stack de comida (64 filetes)',
          '1000 monedas del servidor',
          '3 Llaves de cofres comunes',
          'Set de armadura de hierro',
        ],
        isActive: true,
        isUnlimited: true,
        order: 4,
      },
      {
        name: 'Pack Elite',
        description: 'Pack avanzado con items épicos para dominar el servidor',
        price: 14.99,
        category: 'BUNDLES',
        features: [
          'Set completo de herramientas de netherite',
          'Armadura de netherite Protection IV',
          'Stack de Golden Apples',
          '5000 monedas del servidor',
          '10 Llaves de cofres épicos',
          'Elytras + 64 Fuegos artificiales',
        ],
        isActive: true,
        isUnlimited: true,
        order: 5,
      },
      {
        name: '1000 Monedas',
        description: 'Monedas del servidor para comprar lo que necesites',
        price: 2.99,
        category: 'CURRENCY',
        features: [
          '1000 monedas del servidor',
          'Entrega instantánea',
        ],
        isActive: true,
        isUnlimited: true,
        order: 6,
      },
      {
        name: '5000 Monedas',
        description: 'Gran cantidad de monedas con 20% de bonus',
        price: 12.99,
        category: 'CURRENCY',
        features: [
          '5000 monedas del servidor',
          '+1000 monedas de bonus',
          'Entrega instantánea',
        ],
        isActive: true,
        isUnlimited: true,
        order: 7,
      },
      {
        name: 'Llave Épica',
        description: 'Llave para abrir cofres épicos con recompensas increíbles',
        price: 3.99,
        category: 'KEYS',
        features: [
          '1 Llave de cofre épico',
          'Chance de items legendarios',
          'Posibilidad de ganar rangos',
        ],
        stock: 100,
        isActive: true,
        isUnlimited: false,
        order: 8,
      },
      {
        name: 'Pack 5 Llaves Épicas',
        description: 'Pack de 5 llaves épicas con descuento',
        price: 16.99,
        category: 'KEYS',
        features: [
          '5 Llaves de cofre épico',
          'Ahorra un 15%',
          'Aumenta tus chances de items raros',
        ],
        stock: 50,
        isActive: true,
        isUnlimited: false,
        order: 9,
      },
      {
        name: 'Unban',
        description: 'Elimina tu baneo del servidor (válido para baneos no permanentes)',
        price: 24.99,
        category: 'SPECIAL',
        features: [
          'Elimina tu baneo actual',
          'No válido para baneos permanentes',
          'Procesado en 24h máximo',
          'Solo una vez por cuenta',
        ],
        isActive: true,
        isUnlimited: true,
        order: 10,
      },
    ];

    await Product.insertMany(products);
    console.log('✅ 10 productos de ejemplo creados');
  } catch (error) {
    console.error('❌ Error al crear productos:', error);
  }
};

// Crear posts de ejemplo
const createSamplePosts = async (adminId, adminUsername) => {
  const BlogPost = mongoose.models.BlogPost || mongoose.model('BlogPost', BlogPostSchema);
  
  try {
    const count = await BlogPost.countDocuments();
    if (count > 0) {
      console.log('ℹ️  Ya existen posts en la base de datos');
      return;
    }

    const posts = [
      {
        title: '¡Bienvenidos a 999Wrld Network!',
        slug: 'bienvenidos-a-999wrld-network',
        content: `# ¡Bienvenidos a 999Wrld Network! 🎮

Estamos emocionados de darles la bienvenida a nuestro increíble servidor de Minecraft. Después de meses de desarrollo y pruebas exhaustivas, finalmente abrimos nuestras puertas a toda la comunidad.

## ¿Qué nos hace especiales?

### 🌟 Comunidad Activa
Contamos con una comunidad vibrante y amigable de jugadores de todas partes del mundo. Nuestro Discord está siempre activo con eventos, sorteos y mucha diversión.

### 🛡️ Staff Dedicado 24/7
Nuestro equipo de moderadores y administradores está disponible las 24 horas del día para asegurar que tu experiencia sea la mejor posible.

### 🎪 Eventos Semanales
Cada semana organizamos eventos épicos con premios increíbles:
- **Lunes**: Build Battles
- **Miércoles**: PvP Tournaments
- **Viernes**: Parkour Races
- **Sábados**: Drop Parties
- **Domingos**: Boss Raids

### ⚡ Sistema Anti-Lag
Hemos invertido en la mejor infraestructura para ofrecerte una experiencia de juego fluida y sin interrupciones.

### 🔒 Protección Avanzada
Sistema anti-griefing de última generación que protege todas tus construcciones y objetos.

## Modos de Juego Disponibles

- **Survival**: Experiencia vanilla mejorada con economía y trabajos
- **Skyblock**: Comienza desde cero en tu isla flotante
- **Creative**: Construye lo que imagines sin límites
- **PvP**: Demuestra tus habilidades en combate
- **MiniGames**: Bedwars, Skywars, Duels y más

## Únete Ahora

Connect to: **play.999wrldnetwork.es**

¡Te esperamos en el servidor! 🎉`,
        excerpt: 'Te damos la bienvenida oficial a 999Wrld Network. Conoce todo lo que tenemos preparado para ti en esta nueva aventura.',
        author: adminUsername,
        authorId: adminId,
        coverImage: '/images/welcome-banner.png',
        tags: ['Anuncio', 'Bienvenida', 'Información'],
        isPublished: true,
        publishedAt: new Date('2026-02-10'),
        views: 245,
      },
      {
        title: 'Actualización 1.5: Nueva Temporada de Skyblock',
        slug: 'actualizacion-1-5-nueva-temporada-skyblock',
        content: `# Actualización 1.5: Nueva Temporada de Skyblock 🌴

¡La temporada más esperada finalmente está aquí! Hemos rediseñado completamente la experiencia de Skyblock con toneladas de nuevo contenido.

## Novedades Principales

### 🏝️ Nuevo Sistema de Islas
- Islas más grandes desde el inicio
- Nuevos biomas exclusivos
- Sistema de expansión mejorado
- Límite de miembros aumentado

### 💎 Minions Personalizados
Desbloquea hasta 15 tipos diferentes de minions que te ayudarán a farmear recursos automáticamente:
- Minion de Cobblestone
- Minion de Wheat
- Minion de Cow
- Minion de Iron
- ¡Y muchos más!

### 🏪 Tienda de Isla Mejorada
Nueva interfaz con categorías organizadas y precios balanceados. Ahora es más fácil que nunca encontrar lo que necesitas.

### 🎯 Sistema de Misiones
Completa misiones diarias y semanales para obtener recompensas exclusivas:
- Monedas bonus
- Items raros
- Experiencia multiplicada
- Llaves de cofres

### 🏆 Top Islands
Compite por el top 3 de mejores islas y gana premios increíbles:
- **1er Lugar**: Rango VIP+ permanente + 10,000 monedas
- **2do Lugar**: 5 Llaves Épicas + 5,000 monedas  
- **3er Lugar**: 3 Llaves Épicas + 2,500 monedas

## Correcciones de Bugs

- Solucionado lag en generadores de cobblestone
- Corregido error con las hopper
- Mejorado el rendimiento general
- Arreglado glitch de duplicación

## Reset de Temporada

⚠️ **IMPORTANTE**: Esta actualización incluye un reset completo. Todos los jugadores empezarán desde cero con las siguientes compensaciones:

- **VIP**: 2,000 monedas iniciales
- **VIP+**: 5,000 monedas + Kit Starter
- **MVP**: 10,000 monedas + Kit Elite

¡Nos vemos en la nueva temporada! 🚀`,
        excerpt: 'Descubre todas las novedades de la nueva temporada de Skyblock con minions, misiones y mucho más.',
        author: adminUsername,
        authorId: adminId,
        coverImage: '/images/skyblock-update.png',
        tags: ['Actualización', 'Skyblock', 'Temporada'],
        isPublished: true,
        publishedAt: new Date('2026-02-08'),
        views: 432,
      },
      {
        title: '🎉 Sorteo Semanal: Rango MVP + 10 Llaves Épicas',
        slug: 'sorteo-semanal-rango-mvp',
        content: `# 🎉 Sorteo Semanal: ¡Participa y Gana!

Esta semana tenemos un sorteo ÉPICO para nuestra increíble comunidad.

## Premios

### 🏆 Gran Premio
- **1 Rango MVP** (Valorado en $34.99)
- **10 Llaves Épicas**
- **20,000 Monedas del Servidor**

### 🥈 Segundo Premio  
- **Rango VIP+** (Valorado en $19.99)
- **5 Llaves Épicas**
- **10,000 Monedas**

### 🥉 Tercer Premio
- **Rango VIP** (Valorado en $9.99)
- **3 Llaves Épicas**
- **5,000 Monedas**

## Cómo Participar

Es muy fácil entrar al sorteo:

1. ✅ Únete a nuestro servidor de Discord
2. ✅ Reacciona al mensaje del sorteo con 🎉
3. ✅ Comparte el sorteo en tu estado/historia
4. ✅ (Opcional) Invita amigos para tickets extra

## Reglas

- Debes ser miembro del servidor de Minecraft
- Una entrada por persona
- No se permiten cuentas alt/fake
- El sorteo se realizará el **Domingo 16 de Febrero a las 8PM**
- Los ganadores serán contactados por Discord

## Tickets Extra

¡Aumenta tus chances de ganar!

- +1 Ticket: Por cada amigo que invites (máx. 5)
- +2 Tickets: Si tienes rango VIP o superior
- +3 Tickets: Si eres streamer/youtuber activo

## Ganadores Anteriores

Semana pasada los afortunados fueron:
- **xX_Pro_Xx**: Rango VIP+
- **Minecraftero123**: Pack Elite
- **BuilderPro**: 10,000 Monedas

¡Buena suerte a todos! 🍀

**Discord**: discord.gg/wrld999`,
        excerpt: 'Participa en nuestro sorteo semanal y gana premios increíbles incluyendo rangos, llaves épicas y monedas.',
        author: adminUsername,
        authorId: adminId,
        coverImage: '/images/giveaway.png',
        tags: ['Sorteo', 'Evento', 'Premios'],
        isPublished: true,
        publishedAt: new Date('2026-02-12'),
        views: 589,
      },
      {
        title: 'Guía: Cómo Conseguir Tu Primer Millón de Monedas',
        slug: 'guia-primer-millon-monedas',
        content: `# 💰 Guía: Cómo Conseguir Tu Primer Millón de Monedas

¿Nuevo en el servidor? ¿Quieres hacerte rico rápido? Esta guía te enseñará los mejores métodos para conseguir monedas.

## Método 1: Farming Automático ⭐⭐⭐⭐⭐

El método más rentable a largo plazo.

### Paso 1: Construye tu Farm
- Wheat Farm (Nivel básico)
- Carrot/Potato Farm (Nivel intermedio)
- Pumpkin/Melon Farm (Nivel avanzado)

### Paso 2: Automatiza
- Usa hoppers y water streams
- Invierte en minions (si tienes)
- Optimiza el diseño para máxima eficiencia

**Ganancia**: 50,000 - 200,000 monedas/día

## Método 2: Minería y Venta 🔨 ⭐⭐⭐⭐

Perfecto para comenzar desde cero.

### Qué Minar:
1. **Diamantes**: 1,000 monedas c/u
2. **Emeraldas**: 1,500 monedas c/u
3. **Netherite**: 5,000 monedas c/u

### Tips:
- Usa Fortune III
- Mina en el nivel Y=-59 para diamantes
- Explora Ancient Cities para netherite

**Ganancia**: 30,000 - 100,000 monedas/día

## Método 3: Completar Misiones 📋 ⭐⭐⭐

Ideal para juego casual.

### Tipos de Misiones:
- **Diarias**: 5,000 - 10,000 monedas
- **Semanales**: 25,000 - 50,000 monedas
- **Especiales**: 100,000+ monedas

Simplemente escribe \`/missions\` en el juego.

## Método 4: PvP y Eventos 🗡️ ⭐⭐⭐⭐

Para los más competitivos.

### Eventos con Recompensas:
- **Torneo PvP**: 100,000 al ganador
- **Build Battle**: 50,000 al ganador
- **Parkour Race**: 25,000 al ganador

**Ganancia**: Variable, pero muy alta si eres bueno

## Método 5: Trading 📈 ⭐⭐⭐

Compra barato, vende caro.

### Items más Rentables:
- Encantamientos raros
- Spawners
- Items de eventos limitados

Requiere conocimiento del mercado.

## Tips Generales 💡

1. ✅ No gastes monedas innecesariamente
2. ✅ Invierte en herramientas con Efficiency y Fortune
3. ✅ Únete a una guild activa
4. ✅ Participa en todos los eventos
5. ✅ Vende en /shop durante eventos de precio x2

## Truco Secreto 🤫

Combina TODOS los métodos para maximizar ganancias:
- Farmea mientras estás AFK
- Completa misiones durante el día
- Participa en eventos por las noches
- Vende todo en los mejores momentos

**Resultado**: ¡Tu primer millón en 1-2 semanas!

¿Tienes preguntas? ¡Pregunta en Discord! 💬`,
        excerpt: 'Aprende los mejores métodos para ganar monedas rápidamente en el servidor. Guía completa para principiantes y avanzados.',
        author: adminUsername,
        authorId: adminId,
        coverImage: '/images/money-guide.png',
        tags: ['Guía', 'Tutorial', 'Economía'],
        isPublished: true,
        publishedAt: new Date('2026-02-06'),
        views: 1247,
      },
      {
        title: 'Mantenimiento Programado - 15 de Febrero',
        slug: 'mantenimiento-programado-febrero',
        content: `# ⚙️ Mantenimiento Programado

El servidor estará en mantenimiento el **Jueves 15 de Febrero** para implementar mejoras importantes.

## Horario

**Inicio**: 15/02/2026 a las 3:00 AM (hora del servidor)
**Fin Estimado**: 15/02/2026 a las 7:00 AM

**Duración**: Aproximadamente 4 horas

## Actualizaciones Incluidas

### Rendimiento
- Optimización de chunks
- Reducción de lag en zonas con muchas entities
- Mejoras en el anti-cheat

### Nuevas Características  
- Comando /wild mejorado
- Sistema de backups automáticos
- Nuevos logros

### Correcciones
- Fix de crash en el End
- Corrección de dupes conocidos
- Varios bugs menores

## Compensación

Por las molestias, todos los jugadores que hayan jugado en los últimos 7 días recibirán:

- 💰 **5,000 Monedas**
- 🎁 **1 Llave Épica**
- ⏰ **2 Horas de Boost XP**

Las recompensas se entregarán automáticamente al conectarte después del mantenimiento.

## Avisos Importantes

⚠️ **Asegúrate de estar en un lugar seguro antes del mantenimiento**
⚠️ **Guarda todos tus items importantes en cofres**
⚠️ **El servidor se apagará sin previo aviso a la hora exacta**

## Mantente Informado

Sigue nuestro Discord para actualizaciones en tiempo real del progreso del mantenimiento.

**Discord**: discord.gg/wrld999

¡Gracias por tu paciencia! 🙏`,
        excerpt: 'Información importante sobre el mantenimiento programado del servidor el 15 de febrero y las compensaciones.',
        author: adminUsername,
        authorId: adminId,
        coverImage: '/images/maintenance.png',
        tags: ['Mantenimiento', 'Anuncio', 'Importante'],
        isPublished: true,
        publishedAt: new Date('2026-02-13'),
        views: 823,
      },
    ];

    await BlogPost.insertMany(posts);
    console.log('✅ 5 posts de ejemplo creados');
  } catch (error) {
    console.error('❌ Error al crear posts:', error);
  }
};

// Crear configuraciones iniciales
const createSettings = async () => {
  const Settings = mongoose.models.Settings || mongoose.model('Settings', SettingsSchema);
  
  try {
    const settings = [
      {
        key: 'server_name',
        value: process.env.SITE_NAME || '999Wrld Network',
        description: 'Nombre del servidor',
      },
      {
        key: 'server_ip',
        value: process.env.MINECRAFT_SERVER_IP || 'play.tuservidor.com',
        description: 'IP del servidor de Minecraft',
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Modo mantenimiento activado',
      },
      {
        key: 'maintenance_message',
        value: 'Estamos en mantenimiento. Vuelve más tarde.',
        description: 'Mensaje mostrado durante el mantenimiento',
      },
      {
        key: 'maintenance_discord_webhook',
        value: '',
        description: 'Webhook de Discord para avisos de mantenimiento',
      },
      {
        key: 'global_announcement',
        value: '',
        description: 'Anuncio global en la web',
      },
    ];

    for (const setting of settings) {
      await Settings.findOneAndUpdate(
        { key: setting.key },
        setting,
        { upsert: true }
      );
    }

    console.log('✅ Configuraciones iniciales creadas');
  } catch (error) {
    console.error('❌ Error al crear configuraciones:', error);
  }
};

// Ejecutar inicialización
const init = async () => {
  console.log('🚀 Iniciando configuración de base de datos...\n');
  
  await connectDB();
  
  const admin = await createAdminUser();
  await createSampleProducts();
  
  if (admin) {
    await createSamplePosts(admin._id.toString(), admin.username);
  }
  
  await createSettings();
  
  console.log('\n✅ ¡Inicialización completada con éxito!');
  console.log('\n📝 Próximos pasos:');
  console.log('   1. Ejecuta: npm run dev');
  console.log('   2. Abre: http://localhost:3000');
  console.log('   3. Inicia sesión con las credenciales del admin');
  console.log('   4. ¡Personaliza tu servidor!\n');
  
  process.exit(0);
};

// Manejar errores
process.on('unhandledRejection', (err) => {
  console.error('❌ Error no manejado:', err);
  process.exit(1);
});

// Ejecutar
init();
