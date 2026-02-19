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

const fixTicketsIndex = async () => {
  await connectDB();
  
  console.log('🔧 Eliminando índice problemático de tickets...\n');
  
  try {
    // Obtener todos los índices
    const indexes = await mongoose.connection.db.collection('tickets').indexes();
    console.log('Índices encontrados:');
    indexes.forEach(idx => console.log(`- ${idx.name}:`, idx.key));
    
    // Eliminar el índice ticketId_1 si existe
    const hasTicketIdIndex = indexes.some(idx => idx.name === 'ticketId_1');
    
    if (hasTicketIdIndex) {
      await mongoose.connection.db.collection('tickets').dropIndex('ticketId_1');
      console.log('\n✅ Índice ticketId_1 eliminado correctamente');
    } else {
      console.log('\n⚠️  No se encontró el índice ticketId_1');
    }
    
    console.log('\n✨ Ahora puedes crear tickets sin problemas\n');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
};

fixTicketsIndex();
