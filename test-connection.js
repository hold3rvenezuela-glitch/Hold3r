const { supabase } = require('./lib/supabase');

async function testConnection() {
  console.log('🔄 Probando conexión a Supabase...');
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);

    if (!error) {
      console.log('✅ Conexión exitosa a Supabase y tabla profiles alcanzable.');
    } else {
      console.log('⚠️ Respuesta de Supabase:', error.message, `(Código: ${error.code})`);
    }
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
  }
}

testConnection();

