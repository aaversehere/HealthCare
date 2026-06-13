/* ============================================================
   HEART CARE - Template Konfigurasi Supabase

   Untuk lokal:
   1. Copy file ini menjadi supabase.js
   2. Isi SUPABASE_URL dan SUPABASE_ANON_KEY

   Untuk Vercel:
   - Boleh upload supabase.js jika isinya hanya Project URL dan anon public key.
   - Jangan pernah upload service_role key.
   ============================================================ */

const SUPABASE_URL = 'https://your-project-ref.supabase.co';
const SUPABASE_ANON_KEY = 'your-public-anon-key';

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
