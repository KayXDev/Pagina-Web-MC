/**
 * Script para resetear la contraseña del administrador
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  role: String,
});

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error al conectar a MongoDB:', error);
    process.exit(1);
  }
};

const resetPassword = async () => {
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'ahernandezk08@gmail.com';
    const newPassword = process.env.ADMIN_PASSWORD || 'Loltroll98';
    
    console.log(`\n🔍 Buscando usuario: ${adminEmail}`);
    
    const admin = await User.findOne({ email: adminEmail });
    
    if (!admin) {
      console.error(`❌ No se encontró usuario con email: ${adminEmail}`);
      process.exit(1);
    }

    console.log('✅ Usuario encontrado');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Role actual: ${admin.role}`);
    
    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Actualizar contraseña y rol
    admin.password = hashedPassword;
    admin.role = 'ADMIN';
    await admin.save();
    
    console.log('\n✅ ¡Usuario actualizado correctamente!');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Nuevo Role: ADMIN`);
    console.log('\n💡 Ahora puedes iniciar sesión con estas credenciales como ADMIN\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al resetear contraseña:', error);
    process.exit(1);
  }
};

const init = async () => {
  console.log('🔑 Reseteando contraseña del administrador...\n');
  await connectDB();
  await resetPassword();
};

init();
