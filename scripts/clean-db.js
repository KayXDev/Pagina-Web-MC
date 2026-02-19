const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

const cleanAndRecreate = async () => {
  await connectDB();
  
  console.log('🗑️  Limpiando datos antiguos...\n');
  
  // Eliminar productos y posts del servidor anterior
  await mongoose.connection.db.collection('products').deleteMany({});
  console.log('✅ Productos eliminados');
  
  await mongoose.connection.db.collection('blogposts').deleteMany({});
  console.log('✅ Posts eliminados');
  
  console.log('\n🔄 Ejecuta ahora: npm run init-db\n');
  
  process.exit(0);
};

cleanAndRecreate();
