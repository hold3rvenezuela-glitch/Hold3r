const { supabase } = require('./lib/supabase');

async function testConnection() {
  console.log('🔄 Probando conexión a Supabase...');
  try {
    const { data, error } = await supabase.from('_dummy_table_test_').select('*').limit(1);
    
    // PGRST205 o PGRST204 indican que PostgREST recibió la solicitud y verificó el esquema correctamente
    if (error && (error.code === 'PGRST205' || error.code === 'PGRST204' || error.code === '42P01' || error.message.includes('relation') || error.status === 404)) {
      console.log('✅ Conexión exitosa a Supabase: El servidor respondió correctamente (Código:', error.code + ')');
    } else if (error) {
      console.log('⚠️ Respuesta de Supabase:', error.message, `(Código: ${error.code})`);
      console.log('✅ El servidor de Supabase es alcanzable y respondió.');
    } else {
      console.log('✅ Conexión a Supabase realizada con éxito.');
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  }
}

testConnection();

