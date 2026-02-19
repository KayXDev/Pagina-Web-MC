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

const checkData = async () => {
  await connectDB();
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('\n📦 Colecciones en la base de datos:');
  collections.forEach(col => console.log(`- ${col.name}`));
  
  console.log('\n🔍 Contando documentos...\n');
  
  for (const col of collections) {
    const count = await mongoose.connection.db.collection(col.name).countDocuments();
    console.log(`${col.name}: ${count} documentos`);
    
    if (count > 0 && count < 20) {
      const docs = await mongoose.connection.db.collection(col.name).find().limit(2).toArray();
      console.log(`  Ejemplo:`, JSON.stringify(docs[0], null, 2).substring(0, 200) + '...');
    }
  }
  
  process.exit(0);
};

checkData();
