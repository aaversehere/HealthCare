/* Generated at build time. Do not edit manually. */
const SUPABASE_URL = "https://gzndcnvfjnqafbfcjqmq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6bmRjbnZmam5xYWZiZmNqcW1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyOTU4NDcsImV4cCI6MjA5Njg3MTg0N30.TpzM9FMAQfsIItqcuGsMA3XGaJYeWjIHyXwWfywamHo";

if (!window.supabase?.createClient) {
  throw new Error('Supabase SDK gagal dimuat. Pastikan koneksi internet aktif dan CDN Supabase bisa diakses.');
}

const supabaseSdk = window.supabase;
const supabaseClient = supabaseSdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.supabaseSdk = supabaseSdk;
window.supabaseClient = supabaseClient;
window.supabase = supabaseClient;

async function testSupabaseConnection() {
  try {
    const { data, error } = await window.supabaseClient.from('profiles').select('id').limit(1);
    if (error) throw error;
    console.log('Supabase terhubung!', data);
  } catch (err) {
    console.error('Gagal terhubung ke Supabase:', err.message);
  }
}
