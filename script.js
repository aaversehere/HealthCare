/* ============================================================
   HEART CARE — Application Logic (Supabase Integration)
   Auth: Login, Register, Reset Password, Session, Logout
   Data: Symptoms, Weight, Medications via Supabase
   ============================================================ */

'use strict';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .catch(err => console.error('[PWA] Service worker gagal didaftarkan:', err));
  });
}

/* ------------------------------------------------------------------ */
/*  SCREEN MANAGEMENT                                                   */
/* ------------------------------------------------------------------ */

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

/* ------------------------------------------------------------------ */
/*  VALIDATION HELPERS                                                  */
/* ------------------------------------------------------------------ */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function showFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  if (el) el.textContent = msg;
}

function clearFieldErrors(...ids) {
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });
}

/* ------------------------------------------------------------------ */
/*  ALERT MESSAGES                                                      */
/* ------------------------------------------------------------------ */

function showAlert(alertId, type, message) {
  const el = document.getElementById(alertId);
  if (!el) return;
  const icons = { success: 'ph-check-circle', error: 'ph-x-circle', info: 'ph-info' };
  el.className = `alert alert-${type}`;
  el.innerHTML = `<i class="ph ${icons[type] || 'ph-info'}"></i> ${message}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
}

function hideAlert(alertId) {
  const el = document.getElementById(alertId);
  if (el) el.classList.add('hidden');
}

/* ------------------------------------------------------------------ */
/*  TOAST NOTIFICATIONS                                                 */
/* ------------------------------------------------------------------ */

const toastIcons = {
  success: 'ph-fill ph-check-circle',
  error:   'ph-fill ph-x-circle',
  warning: 'ph-fill ph-warning-circle',
  info:    'ph-fill ph-info',
};

function showToast(type, message, duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'status');
  toast.innerHTML = `
    <i class="${toastIcons[type] || toastIcons.info} toast-icon"></i>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="removeToast(this.parentElement)" aria-label="Tutup"><i class="ph ph-x"></i></button>
  `;
  container.appendChild(toast);
  const timer = setTimeout(() => removeToast(toast), duration);
  toast._timer = timer;
}

function removeToast(toast) {
  if (!toast || !toast.parentElement) return;
  clearTimeout(toast._timer);
  toast.classList.add('toast-out');
  setTimeout(() => toast.remove(), 300);
}

/* ------------------------------------------------------------------ */
/*  PASSWORD TOGGLE                                                     */
/* ------------------------------------------------------------------ */

function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  const icon = btn.querySelector('i');
  if (icon) icon.className = isHidden ? 'ph ph-eye-slash' : 'ph ph-eye';
}

/* ------------------------------------------------------------------ */
/*  PASSWORD STRENGTH CHECKER                                           */
/* ------------------------------------------------------------------ */

function checkPasswordStrength(value) {
  const fill  = document.getElementById('strength-fill');
  const label = document.getElementById('strength-label');
  if (!fill || !label) return;

  const checks = {
    len:     value.length >= 8,
    upper:   /[A-Z]/.test(value),
    num:     /[0-9]/.test(value),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
  };
  const met = Object.values(checks).filter(Boolean).length;
  const colors = ['', '#E63946', '#F4A261', '#F4A261', '#2A9D8F'];
  const labels = ['', 'Sangat Lemah', 'Lemah', 'Sedang', 'Kuat'];

  fill.style.width      = met === 0 ? '0%' : `${(met / 4) * 100}%`;
  fill.style.background = colors[met] || '';
  label.textContent     = met === 0 ? 'Masukkan password' : labels[met];
  label.style.color     = colors[met] || 'var(--text-muted)';

  updateReq('req-len',     checks.len);
  updateReq('req-upper',   checks.upper);
  updateReq('req-num',     checks.num);
  updateReq('req-special', checks.special);
}

function updateReq(id, met) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('met', met);
  const icon = el.querySelector('i');
  if (icon) icon.className = met ? 'ph ph-check-circle' : 'ph ph-circle';
}

/* ------------------------------------------------------------------ */
/*  REGISTRATION MULTI-STEP                                             */
/* ------------------------------------------------------------------ */

let currentStep = 1;

function nextStep(step) {
  if (step === 2 && !validateStep1()) return;
  if (step === 3 && !validateStep2()) return;

  document.getElementById(`reg-step-${currentStep}`).classList.add('hidden');
  document.getElementById(`reg-step-${step}`).classList.remove('hidden');

  document.getElementById(`step-${currentStep}-dot`).classList.remove('active');
  document.getElementById(`step-${currentStep}-dot`).classList.add('done');

  const lines = document.querySelectorAll('.step-line');
  if (step === 3 && lines[0]) lines[0].classList.add('done');

  document.getElementById(`step-${step}-dot`).classList.add('active');
  currentStep = step;
}

function prevStep(step) {
  document.getElementById(`reg-step-${currentStep}`).classList.add('hidden');
  document.getElementById(`reg-step-${step}`).classList.remove('hidden');

  document.getElementById(`step-${currentStep}-dot`).classList.remove('active');
  document.getElementById(`step-${currentStep}-dot`).classList.remove('done');
  document.getElementById(`step-${step}-dot`).classList.remove('done');
  document.getElementById(`step-${step}-dot`).classList.add('active');

  const lines = document.querySelectorAll('.step-line');
  if (currentStep === 3 && lines[0]) lines[0].classList.remove('done');

  currentStep = step;
}

function validateStep1() {
  clearFieldErrors('reg-fn-err', 'reg-email-err');
  let valid = true;

  const fn = document.getElementById('reg-firstname').value.trim();
  if (!fn) { showFieldError('reg-fn-err', 'Nama depan wajib diisi'); valid = false; }

  const email = document.getElementById('reg-email').value.trim();
  if (!email) {
    showFieldError('reg-email-err', 'Email wajib diisi'); valid = false;
  } else if (!isValidEmail(email)) {
    showFieldError('reg-email-err', 'Format email tidak valid'); valid = false;
  }
  return valid;
}

function validateStep2() {
  clearFieldErrors('reg-pass-err', 'reg-cpass-err');
  let valid = true;
  const pass    = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm-pass').value;

  if (!pass || pass.length < 8) {
    showFieldError('reg-pass-err', 'Password minimal 8 karakter'); valid = false;
  }
  if (!confirm) {
    showFieldError('reg-cpass-err', 'Konfirmasi password wajib diisi'); valid = false;
  } else if (pass !== confirm) {
    showFieldError('reg-cpass-err', 'Password tidak cocok'); valid = false;
  }
  return valid;
}

/* ------------------------------------------------------------------ */
/*  HANDLE REGISTER — Supabase Auth                                     */
/* ------------------------------------------------------------------ */

async function handleRegister(e) {
  e.preventDefault();
  clearFieldErrors('reg-tos-err');

  const tos = document.getElementById('reg-tos').checked;
  if (!tos) { showFieldError('reg-tos-err', 'Anda harus menyetujui syarat & ketentuan'); return; }

  const btn    = document.getElementById('btn-register-submit');
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  text.classList.add('hidden');
  loader.classList.remove('hidden');
  btn.disabled = true;

  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName  = document.getElementById('reg-lastname').value.trim();
  const email     = document.getElementById('reg-email').value.trim().toLowerCase();
  const password  = document.getElementById('reg-password').value;
  const phone     = document.getElementById('reg-phone').value.trim();
  const dob       = document.getElementById('reg-dob').value;
  const gender    = document.getElementById('reg-gender').value;
  const diagnosis = document.getElementById('reg-diagnosis').value;

  console.log('🔄 [Register] Mencoba daftar:', email);

  try {
    // 1. Daftar ke Supabase Auth
    const profilePayload = {
      first_name: firstName,
      last_name: lastName || '',
      phone: phone || null,
      date_of_birth: dob || null,
      gender: gender || null,
      diagnosis: diagnosis || null,
    };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: profilePayload
      }
    });

    console.log('📋 [Register] signUp result:', { data, error });

    if (error) throw error;

    // Cek apakah email sudah dipakai (Supabase mengembalikan user tapi identities kosong)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      throw new Error('Email sudah terdaftar. Silakan gunakan email lain atau login.');
    }

    // 2. Simpan profil lengkap di tabel profiles
    if (data.user && data.session) {
      console.log('👤 [Register] Menyimpan profil untuk user:', data.user.id);
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id:            data.user.id,
          ...profilePayload,
        }, { onConflict: 'id' });

      if (profileErr) {
        console.error('❌ [Register] Profile error:', profileErr);
        // Tidak throw — profil bisa diisi nanti lewat trigger
      } else {
        console.log('✅ [Register] Profil tersimpan!');
      }
    } else if (data.user) {
      console.log('[Register] Email confirmation aktif; profil dibuat oleh trigger database.');
    }

    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;
    currentStep  = 1;

    showSuccessModal(
      'Akun Berhasil Dibuat! 🎉',
      `Selamat datang, ${firstName}! Silakan cek email Anda untuk konfirmasi, lalu masuk.`
    );
  } catch (err) {
    console.error('❌ [Register] Error:', err);
    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;
    showAlert('register-alert', 'error', err.message || 'Gagal mendaftar. Coba lagi.');
  }
}

/* ------------------------------------------------------------------ */
/*  HANDLE LOGIN — Supabase Auth                                        */
/* ------------------------------------------------------------------ */

async function handleLogin(e) {
  e.preventDefault();
  clearFieldErrors('login-email-err', 'login-pass-err');
  hideAlert('login-alert');

  const email    = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  let valid = true;
  if (!email || !isValidEmail(email)) {
    showFieldError('login-email-err', 'Email tidak valid'); valid = false;
  }
  if (!password) {
    showFieldError('login-pass-err', 'Password wajib diisi'); valid = false;
  }
  if (!valid) return;

  const btn    = document.getElementById('btn-login-submit');
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  text.classList.add('hidden');
  loader.classList.remove('hidden');
  btn.disabled = true;

  console.log('🔄 [Login] Mencoba masuk:', email);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('📋 [Login] signIn result:', { data, error });
    if (error) throw error;

    // Ambil profil user
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    console.log('👤 [Login] Profile:', { profile, profileErr });

    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;

    const user = {
      id:        data.user.id,
      email:     data.user.email,
      firstName: profile?.first_name || data.user.user_metadata?.first_name || data.user.email.split('@')[0],
      lastName:  profile?.last_name  || data.user.user_metadata?.last_name  || '',
      diagnosis: profile?.diagnosis  || '',
    };

    console.log('✅ [Login] Berhasil masuk sebagai:', user.firstName);
    initDashboard(user);
    showScreen('screen-dashboard');
    showToast('success', `Selamat datang, ${user.firstName}! 💙`);

  } catch (err) {
    console.error('❌ [Login] Error:', err);
    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;

    let msg = err.message || 'Gagal masuk. Coba lagi.';
    if (msg.includes('Invalid login credentials')) msg = 'Email atau password salah.';
    if (msg.includes('Email not confirmed'))        msg = 'Email belum dikonfirmasi. Cek inbox Anda.';
    showAlert('login-alert', 'error', msg);
    document.getElementById('login-password').value = '';
  }
}

/* ------------------------------------------------------------------ */
/*  DASHBOARD INIT                                                      */
/* ------------------------------------------------------------------ */

// Simpan session user di memori (tidak perlu localStorage)
let _currentUser = null;

function initDashboard(user) {
  _currentUser = user;
  const fullName = `${user.firstName} ${user.lastName || ''}`.trim();
  const initials = (user.firstName?.[0] || '') + (user.lastName?.[0] || user.firstName?.[1] || '');

  const hour     = new Date().getHours();
  const greeting = hour < 11 ? 'Selamat Pagi,' : hour < 15 ? 'Selamat Siang,' : hour < 18 ? 'Selamat Sore,' : 'Selamat Malam,';

  document.getElementById('dash-greeting').textContent  = greeting;
  document.getElementById('dash-username').textContent  = user.firstName;
  document.getElementById('sidebar-name').textContent   = fullName;
  document.getElementById('sidebar-avatar').textContent = initials.toUpperCase();
  document.getElementById('topbar-avatar').textContent  = initials.toUpperCase();

  toggleSidebar(false);
  setBottomNav('bnav-home');
}

/* ------------------------------------------------------------------ */
/*  SIDEBAR                                                             */
/* ------------------------------------------------------------------ */

function toggleSidebar(open) {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar || !overlay) return;
  if (open) {
    sidebar.classList.add('open');
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
  } else {
    sidebar.classList.remove('open');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
  }
}

/* ------------------------------------------------------------------ */
/*  LOGOUT — Supabase Auth                                              */
/* ------------------------------------------------------------------ */

function handleLogout() {
  const modal = document.getElementById('logout-modal');
  if (modal) modal.classList.remove('hidden');
}

function closeLogoutModal() {
  const modal = document.getElementById('logout-modal');
  if (modal) modal.classList.add('hidden');
}

async function confirmLogout() {
  closeLogoutModal();
  await supabase.auth.signOut();
  _currentUser = null;
  currentStep  = 1;
  toggleSidebar(false);

  const forms = document.querySelectorAll('form');
  forms.forEach(f => f.reset());

  showToast('info', 'Anda telah keluar dari HEART CARE. Sampai jumpa!');
  showScreen('screen-splash');
}

/* ------------------------------------------------------------------ */
/*  SUCCESS MODAL                                                       */
/* ------------------------------------------------------------------ */

function showSuccessModal(title, message, onOk) {
  document.getElementById('success-modal-title').textContent = title;
  document.getElementById('success-modal-msg').textContent   = message;
  document.getElementById('success-modal').classList.remove('hidden');
  window._successCallback = onOk || null;
}

function closeSuccessModal() {
  document.getElementById('success-modal').classList.add('hidden');
  if (typeof window._successCallback === 'function') {
    window._successCallback();
    window._successCallback = null;
  } else {
    showScreen('screen-login');
  }
}

/* ------------------------------------------------------------------ */
/*  RESET PASSWORD — Supabase Auth                                      */
/* ------------------------------------------------------------------ */

async function handleResetEmail(e) {
  e.preventDefault();
  clearFieldErrors('reset-email-err');
  hideAlert('reset-alert');

  const email = document.getElementById('reset-email').value.trim().toLowerCase();
  if (!email || !isValidEmail(email)) {
    showFieldError('reset-email-err', 'Email tidak valid'); return;
  }

  const btn    = document.getElementById('btn-reset-send');
  const text   = btn.querySelector('.btn-text');
  const loader = btn.querySelector('.btn-loader');
  text.classList.add('hidden');
  loader.classList.remove('hidden');
  btn.disabled = true;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/index.html',
    });
    if (error) throw error;

    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;

    showToast('success', `Link reset password dikirim ke ${email}`);
    showAlert('reset-alert', 'success', 'Cek email Anda untuk link reset password.');

  } catch (err) {
    text.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;
    showAlert('reset-alert', 'error', err.message || 'Gagal mengirim email. Coba lagi.');
  }
}

// OTP & New Password — tidak dipakai lagi (Supabase kirim link email langsung)
function otpNav() {}
function otpBack() {}
function handleResetOTP(e) { e.preventDefault(); }
function handleNewPassword(e) { e.preventDefault(); }
function resendOTP() {}

/* ------------------------------------------------------------------ */
/*  SESSION CHECK — Supabase Auth                                       */
/* ------------------------------------------------------------------ */

async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    const user = {
      id:        session.user.id,
      email:     session.user.email,
      firstName: profile?.first_name || session.user.email.split('@')[0],
      lastName:  profile?.last_name  || '',
      diagnosis: profile?.diagnosis  || '',
    };

    initDashboard(user);
    showScreen('screen-dashboard');
    showToast('success', `Selamat datang kembali, ${user.firstName}! 💙`);
  } else {
    showScreen('screen-splash');
  }
}

/* ------------------------------------------------------------------ */
/*  SHAKE KEYFRAME                                                      */
/* ------------------------------------------------------------------ */

(function injectShakeKeyframes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shake {
      0%,100% { transform: translateX(0); }
      20%      { transform: translateX(-8px); }
      40%      { transform: translateX(8px); }
      60%      { transform: translateX(-4px); }
      80%      { transform: translateX(4px); }
    }
  `;
  document.head.appendChild(style);
})();

/* ------------------------------------------------------------------ */
/*  KEYBOARD SUPPORT                                                    */
/* ------------------------------------------------------------------ */

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLogoutModal();
    closeSuccessModal();
  }
});

/* ------------------------------------------------------------------ */
/*  DESKTOP SIDEBAR                                                     */
/* ------------------------------------------------------------------ */

function handleDesktopSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  sidebar.style.position = 'fixed';
}

window.addEventListener('resize', handleDesktopSidebar);

document.addEventListener('DOMContentLoaded', async () => {
  // Test koneksi Supabase saat halaman load
  console.log('🔌 [Supabase] Menghubungkan ke:', typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : 'URL tidak ditemukan!');
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1);
    if (error) console.error('❌ [Supabase] Koneksi gagal:', error.message, '\n→ Pastikan SQL sudah dijalankan di Supabase!');
    else       console.log('✅ [Supabase] Koneksi berhasil! Tabel profiles ditemukan.');
  } catch(e) {
    console.error('❌ [Supabase] Error:', e.message);
  }

  checkSession();
  handleDesktopSidebar();
});

/* ================================================================== */
/*  PAGE ROUTER                                                         */
/* ================================================================== */

function showPage(pageId, navId) {
  document.querySelectorAll('.dash-page').forEach(p => p.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const page = document.getElementById(pageId);
  if (page) page.classList.remove('hidden');

  const nav = document.getElementById(navId);
  if (nav) nav.classList.add('active');

  const bnavMap = {
    'nav-home':     'bnav-home',
    'nav-symptoms': 'bnav-symptoms',
    'nav-weight':   'bnav-weight',
    'nav-meds':     'bnav-meds',
    'nav-reports':  'bnav-reports',
  };
  if (bnavMap[navId]) setBottomNav(bnavMap[navId]);

  if (window.innerWidth < 1024) toggleSidebar(false);

  if (pageId === 'page-home')     updateHomeSummary();
  if (pageId === 'page-symptoms') renderSymptoms();
  if (pageId === 'page-weight')   renderWeights();
  if (pageId === 'page-meds')   { renderMedChecklist(); renderMeds(); }
  if (pageId === 'page-reports')  renderReports();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setBottomNav(bnavId) {
  document.querySelectorAll('.bnav-item').forEach(item => {
    item.classList.remove('active');
    const icon = item.querySelector('i');
    if (icon) icon.className = icon.className.replace('ph-fill ', 'ph ');
  });
  const active = document.getElementById(bnavId);
  if (active) {
    active.classList.add('active');
    const icon = active.querySelector('i');
    if (icon && !icon.className.includes('ph-fill'))
      icon.className = icon.className.replace('ph ', 'ph-fill ');
  }
}

/* ================================================================== */
/*  HELPERS                                                             */
/* ================================================================== */

function getCurrentUserId() {
  return _currentUser?.id || null;
}

async function ensureCurrentUserProfile() {
  if (!_currentUser?.id) return null;

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: _currentUser.id,
      first_name: _currentUser.firstName || '',
      last_name: _currentUser.lastName || '',
      diagnosis: _currentUser.diagnosis || null,
    }, { onConflict: 'id' });

  if (error) throw new Error('Profil pengguna belum siap: ' + error.message);
  return _currentUser.id;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(isoStr) {
  if (!isoStr) return '--';
  const d = new Date(isoStr.includes('T') ? isoStr : isoStr + 'T00:00');
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '--';
  const d = new Date(isoStr);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ================================================================== */
/*  HOME SUMMARY                                                        */
/* ================================================================== */

async function updateHomeSummary() {
  const uid = getCurrentUserId();

  const el = document.getElementById('home-name');
  if (el && _currentUser) el.textContent = _currentUser.firstName;

  const dateEl = document.getElementById('home-date-label');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (!uid) return;

  // Symptom count
  const { count: symCount } = await supabase
    .from('symptoms').select('*', { count: 'exact', head: true }).eq('user_id', uid);
  const symEl = document.getElementById('home-sym-count');
  if (symEl) symEl.textContent = (symCount || 0) + ' catatan';

  // Latest weight
  const { data: wData } = await supabase
    .from('weight_records').select('weight_kg').eq('user_id', uid)
    .order('recorded_date', { ascending: false }).limit(1);
  const wEl = document.getElementById('home-weight-last');
  if (wEl) wEl.textContent = wData?.length ? wData[0].weight_kg + ' kg' : 'Belum ada data';

  // Med count
  const { count: medCount } = await supabase
    .from('medications').select('*', { count: 'exact', head: true })
    .eq('user_id', uid).eq('is_active', true);
  const mEl = document.getElementById('home-meds-count');
  if (mEl) mEl.textContent = (medCount || 0) + ' obat';

  checkWeightAlert('home-weight-alert', 'home-weight-alert-msg');
}

/* ================================================================== */
/*  MODULE 1: CATATAN GEJALA — Supabase                                 */
/* ================================================================== */

let selectedSeverity = 0;

function toggleSymForm(show) {
  const form = document.getElementById('sym-form');
  if (!form) return;
  if (show) {
    form.classList.remove('hidden');
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const dtInput = document.getElementById('sym-datetime');
    if (dtInput) dtInput.value = now.toISOString().slice(0, 16);
    selectedSeverity = 0;
    document.querySelectorAll('.sev-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('sym-type').value  = '';
    document.getElementById('sym-notes').value = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    form.classList.add('hidden');
  }
}

function setSeverity(val) {
  selectedSeverity = val;
  document.querySelectorAll('.sev-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.val) === val);
  });
  document.getElementById('sym-sev-err').textContent = '';
}

async function saveSymptom() {
  const type     = document.getElementById('sym-type').value;
  const datetime = document.getElementById('sym-datetime').value;
  const notes    = document.getElementById('sym-notes').value.trim();
  const uid      = getCurrentUserId();

  let valid = true;
  if (!type)             { document.getElementById('sym-type-err').textContent = 'Pilih jenis gejala'; valid = false; }
  else                   { document.getElementById('sym-type-err').textContent = ''; }
  if (!selectedSeverity) { document.getElementById('sym-sev-err').textContent  = 'Pilih tingkat keparahan'; valid = false; }
  if (!valid || !uid) return;

  let profileUid = uid;
  try {
    profileUid = await ensureCurrentUserProfile();
  } catch (err) {
    showToast('error', err.message || 'Gagal menyiapkan profil pengguna');
    return;
  }

  const { error } = await supabase.from('symptoms').insert({
    user_id:      profileUid,
    symptom_type: type,
    severity:     selectedSeverity,
    recorded_at:  datetime ? new Date(datetime).toISOString() : new Date().toISOString(),
    notes:        notes || null,
  });

  if (error) { showToast('error', 'Gagal menyimpan: ' + error.message); return; }

  toggleSymForm(false);
  await renderSymptoms();
  await updateHomeSummary();
  showToast('success', 'Gejala berhasil dicatat!');
}

async function deleteSymptom(id) {
  const uid = getCurrentUserId();
  const { error } = await supabase.from('symptoms').delete().eq('id', id).eq('user_id', uid);
  if (error) { showToast('error', 'Gagal menghapus'); return; }
  renderSymptoms();
  updateHomeSummary();
  showToast('info', 'Catatan dihapus');
}

const sevLabels = ['', 'Ringan', 'Hampir Ringan', 'Sedang', 'Cukup Berat', 'Berat'];

async function renderSymptoms() {
  const uid   = getCurrentUserId();
  const list  = document.getElementById('sym-list');
  const empty = document.getElementById('sym-empty');
  if (!list || !empty) return;

  if (!uid) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }

  const { data, error } = await supabase
    .from('symptoms').select('*').eq('user_id', uid)
    .order('recorded_at', { ascending: false });

  if (error) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('p').textContent = 'Gagal memuat catatan gejala';
    empty.querySelector('small').textContent = error.message;
    return;
  }

  if (!data?.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('p').textContent = 'Belum ada catatan gejala';
    empty.querySelector('small').textContent = 'Tekan "Tambah" untuk mulai mencatat';
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = data.map(s => `
    <div class="record-item">
      <div class="record-icon icon-red"><i class="ph-fill ph-activity"></i></div>
      <div class="record-body">
        <span class="record-title">${s.symptom_type}</span>
        <div class="record-meta">
          <span><i class="ph ph-clock"></i> ${formatDateTime(s.recorded_at)}</span>
          <span class="sev-badge sev-${s.severity}">Keparahan ${s.severity} — ${sevLabels[s.severity]}</span>
        </div>
        ${s.notes ? `<span class="record-notes">"${s.notes}"</span>` : ''}
      </div>
      <div class="record-actions">
        <button class="btn-record-del" onclick="deleteSymptom('${s.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `).join('');
}

/* ================================================================== */
/*  MODULE 2: BERAT BADAN — Supabase                                    */
/* ================================================================== */

function toggleWeightForm(show) {
  const form = document.getElementById('weight-form');
  if (!form) return;
  if (show) {
    form.classList.remove('hidden');
    document.getElementById('weight-date').value = todayStr();
    document.getElementById('weight-val').value  = '';
    document.getElementById('weight-note').value = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    form.classList.add('hidden');
  }
}

async function saveWeight() {
  const date = document.getElementById('weight-date').value;
  const val  = parseFloat(document.getElementById('weight-val').value);
  const note = document.getElementById('weight-note').value.trim();
  const uid  = getCurrentUserId();

  let valid = true;
  if (!date)            { document.getElementById('weight-date-err').textContent = 'Pilih tanggal'; valid = false; }
  else                  { document.getElementById('weight-date-err').textContent = ''; }
  if (isNaN(val) || val < 20) { document.getElementById('weight-val-err').textContent = 'Masukkan berat yang valid'; valid = false; }
  else                  { document.getElementById('weight-val-err').textContent = ''; }
  if (!valid || !uid) return;

  let profileUid = uid;
  try {
    profileUid = await ensureCurrentUserProfile();
  } catch (err) {
    showToast('error', err.message || 'Gagal menyiapkan profil pengguna');
    return;
  }

  const { error } = await supabase.from('weight_records').insert({
    user_id:       profileUid,
    weight_kg:     val,
    recorded_date: date,
    notes:         note || null,
  });

  if (error) { showToast('error', 'Gagal menyimpan: ' + error.message); return; }

  toggleWeightForm(false);
  await renderWeights();
  await updateHomeSummary();
  showToast('success', `Berat badan ${val} kg berhasil dicatat!`);
}

async function deleteWeight(id) {
  const uid = getCurrentUserId();
  const { error } = await supabase.from('weight_records').delete().eq('id', id).eq('user_id', uid);
  if (error) { showToast('error', 'Gagal menghapus'); return; }
  renderWeights();
  updateHomeSummary();
  showToast('info', 'Data berat dihapus');
}

async function checkWeightAlert(alertId, msgId) {
  const uid    = getCurrentUserId();
  const alertEl = document.getElementById(alertId);
  const msgEl   = document.getElementById(msgId);
  if (!alertEl || !msgEl || !uid) return;

  const { data } = await supabase
    .from('weight_records').select('weight_kg, recorded_date').eq('user_id', uid)
    .order('recorded_date', { ascending: false }).limit(10);

  if (!data || data.length < 2) { alertEl.classList.add('hidden'); return; }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutStr = cutoff.toISOString().slice(0, 10);
  const recent = data.filter(w => w.recorded_date >= cutStr);

  if (recent.length >= 2) {
    const diff = +(recent[0].weight_kg - recent[recent.length - 1].weight_kg).toFixed(1);
    if (diff >= 2) {
      msgEl.textContent = `⚠ Berat naik ${diff}kg dalam 3 hari terakhir. Segera hubungi dokter!`;
      alertEl.classList.remove('hidden');
      return;
    }
  }
  alertEl.classList.add('hidden');
}

async function renderWeights() {
  const uid   = getCurrentUserId();
  const list  = document.getElementById('weight-list');
  const empty = document.getElementById('weight-empty');
  if (!list || !empty) return;

  if (!uid) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }

  const { data, error } = await supabase
    .from('weight_records').select('*').eq('user_id', uid)
    .order('recorded_date', { ascending: false });

  // Update strip
  const wssLatest = document.getElementById('wss-latest');
  const wssChange = document.getElementById('wss-change');
  const wssTotal  = document.getElementById('wss-total');

  if (data?.length) {
    if (wssLatest) wssLatest.textContent = data[0].weight_kg + ' kg';
    if (wssTotal)  wssTotal.textContent  = data.length;

    if (data.length >= 2) {
      const diff = +(data[0].weight_kg - data[data.length - 1].weight_kg).toFixed(1);
      if (wssChange) wssChange.textContent = (diff >= 0 ? '+' : '') + diff + ' kg';
    } else {
      if (wssChange) wssChange.textContent = '--';
    }
  } else {
    if (wssLatest) wssLatest.textContent = '--';
    if (wssChange) wssChange.textContent = '--';
    if (wssTotal)  wssTotal.textContent  = '0';
  }

  checkWeightAlert('weight-alert', 'weight-alert-msg');

  if (error) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('p').textContent = 'Gagal memuat data berat badan';
    empty.querySelector('small').textContent = error.message;
    return;
  }

  if (!data?.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    empty.querySelector('p').textContent = 'Belum ada data berat badan';
    empty.querySelector('small').textContent = 'Tekan "Tambah" untuk mulai mencatat';
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = data.map(w => `
    <div class="record-item">
      <div class="record-icon icon-blue"><i class="ph-fill ph-scales"></i></div>
      <div class="record-body">
        <span class="record-title">${w.weight_kg} kg</span>
        <div class="record-meta">
          <span><i class="ph ph-calendar"></i> ${formatDate(w.recorded_date)}</span>
          ${w.notes ? `<span><i class="ph ph-note"></i> ${w.notes}</span>` : ''}
        </div>
      </div>
      <div class="record-actions">
        <button class="btn-record-del" onclick="deleteWeight('${w.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `).join('');
}

/* ================================================================== */
/*  MODULE 3: OBAT-OBATAN — Supabase                                    */
/* ================================================================== */

function toggleMedForm(show) {
  const form = document.getElementById('med-form');
  if (!form) return;
  if (show) {
    form.classList.remove('hidden');
    document.getElementById('med-name').value = '';
    document.getElementById('med-dose').value = '';
    document.getElementById('med-freq').value = '1';
    document.getElementById('med-note').value = '';
    updateMedTimeFields();
    form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    form.classList.add('hidden');
  }
}

function updateMedTimeFields() {
  const freq  = parseInt(document.getElementById('med-freq').value) || 1;
  const wrap  = document.getElementById('med-time-fields');
  if (!wrap) return;
  const defaults = ['07:00', '13:00', '19:00', '22:00'];
  wrap.innerHTML = Array.from({ length: freq }, (_, i) => `
    <div class="input-wrap">
      <i class="ph ph-clock input-icon"></i>
      <input type="time" class="form-input med-time-input" id="med-time-${i}" value="${defaults[i] || '08:00'}" />
    </div>
  `).join('');
}

async function saveMed() {
  const name = document.getElementById('med-name').value.trim();
  const dose = document.getElementById('med-dose').value.trim();
  const freq = parseInt(document.getElementById('med-freq').value) || 1;
  const note = document.getElementById('med-note').value.trim();
  const uid  = getCurrentUserId();

  if (!name) { document.getElementById('med-name-err').textContent = 'Nama obat wajib diisi'; return; }
  document.getElementById('med-name-err').textContent = '';

  const times = [];
  for (let i = 0; i < freq; i++) {
    const t = document.getElementById(`med-time-${i}`);
    times.push(t ? t.value : '08:00');
  }

  const { error } = await supabase.from('medications').insert({
    user_id:   uid,
    name,
    dose:      dose || null,
    frequency: freq,
    times,
    notes:     note || null,
    is_active: true,
  });

  if (error) { showToast('error', 'Gagal menyimpan: ' + error.message); return; }

  toggleMedForm(false);
  renderMedChecklist();
  renderMeds();
  updateHomeSummary();
  showToast('success', `Obat "${name}" berhasil ditambahkan!`);
}

async function deleteMed(id) {
  const uid = getCurrentUserId();
  const { error } = await supabase.from('medications').delete().eq('id', id).eq('user_id', uid);
  if (error) { showToast('error', 'Gagal menghapus'); return; }
  renderMedChecklist();
  renderMeds();
  updateHomeSummary();
  showToast('info', 'Obat dihapus');
}

async function toggleMedTaken(medId, scheduledTime) {
  const uid   = getCurrentUserId();
  const today = todayStr();

  // Cek apakah log sudah ada
  const { data: existing } = await supabase
    .from('medication_logs')
    .select('*')
    .eq('medication_id', medId)
    .eq('log_date', today)
    .eq('scheduled_time', scheduledTime)
    .single();

  if (existing) {
    // Toggle taken status
    const newTaken = !existing.taken;
    await supabase.from('medication_logs').update({
      taken:    newTaken,
      taken_at: newTaken ? new Date().toISOString() : null,
    }).eq('id', existing.id);
    showToast(newTaken ? 'success' : 'info', newTaken ? 'Obat dicatat diminum ✓' : 'Ditandai belum diminum');
  } else {
    // Insert baru
    await supabase.from('medication_logs').insert({
      user_id:        uid,
      medication_id:  medId,
      log_date:       today,
      scheduled_time: scheduledTime,
      taken:          true,
      taken_at:       new Date().toISOString(),
    });
    showToast('success', 'Obat dicatat diminum ✓');
  }

  renderMedChecklist();
}

async function renderMedChecklist() {
  const uid   = getCurrentUserId();
  const wrap  = document.getElementById('meds-checklist');
  const empty = document.getElementById('checklist-empty');
  const label = document.getElementById('meds-today-label');
  if (!wrap || !empty) return;

  const today = todayStr();
  if (label) label.textContent = formatDate(today);

  if (!uid) { wrap.innerHTML = ''; empty.classList.remove('hidden'); return; }

  const { data: meds } = await supabase
    .from('medications').select('*').eq('user_id', uid).eq('is_active', true);

  if (!meds?.length) {
    wrap.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Ambil log hari ini
  const { data: logs } = await supabase
    .from('medication_logs').select('*').eq('user_id', uid).eq('log_date', today);

  const logMap = {};
  logs?.forEach(l => { logMap[`${l.medication_id}_${l.scheduled_time}`] = l.taken; });

  let html = '';
  meds.forEach(med => {
    (med.times || []).forEach(time => {
      const key   = `${med.id}_${time}`;
      const taken = logMap[key] || false;
      html += `
        <div class="checklist-item ${taken ? 'taken' : ''}">
          <button class="check-toggle" onclick="toggleMedTaken('${med.id}', '${time}')" title="${taken ? 'Tandai belum' : 'Tandai diminum'}">
            <i class="ph-fill ph-check"></i>
          </button>
          <div class="check-info">
            <span class="check-name">${med.name}${med.dose ? ' ' + med.dose : ''}</span>
            <span class="check-time"><i class="ph ph-clock"></i> ${time} WIB${med.notes ? ' · ' + med.notes : ''}</span>
          </div>
          <span class="check-status">${taken ? '✓ Diminum' : 'Belum'}</span>
        </div>
      `;
    });
  });
  wrap.innerHTML = html;
}

async function renderMeds() {
  const uid   = getCurrentUserId();
  const list  = document.getElementById('meds-list');
  const empty = document.getElementById('meds-list-empty');
  if (!list || !empty) return;

  if (!uid) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }

  const { data, error } = await supabase
    .from('medications').select('*').eq('user_id', uid).eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error || !data?.length) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = data.map(m => `
    <div class="record-item">
      <div class="record-icon icon-green"><i class="ph-fill ph-pill"></i></div>
      <div class="record-body">
        <span class="record-title">${m.name}${m.dose ? ' ' + m.dose : ''}</span>
        <div class="record-meta">
          <span><i class="ph ph-repeat"></i> ${m.frequency}x sehari</span>
          <span><i class="ph ph-clock"></i> ${(m.times || []).join(', ')}</span>
          ${m.notes ? `<span><i class="ph ph-note"></i> ${m.notes}</span>` : ''}
        </div>
      </div>
      <div class="record-actions">
        <button class="btn-record-del" onclick="deleteMed('${m.id}')" title="Hapus"><i class="ph ph-trash"></i></button>
      </div>
    </div>
  `).join('');
}

/* ================================================================== */
/*  MODULE 4: LAPORAN — Supabase                                        */
/* ================================================================== */

async function renderReports() {
  const uid = getCurrentUserId();
  if (!uid) return;

  // Ambil semua data paralel
  const [
    { data: syms,    count: symCount  },
    { data: weights, count: wCount    },
    { data: meds,    count: medCount  },
    { data: logs }
  ] = await Promise.all([
    supabase.from('symptoms').select('*', { count: 'exact' }).eq('user_id', uid).order('recorded_at', { ascending: false }),
    supabase.from('weight_records').select('*', { count: 'exact' }).eq('user_id', uid).order('recorded_date', { ascending: false }),
    supabase.from('medications').select('*', { count: 'exact' }).eq('user_id', uid).eq('is_active', true),
    supabase.from('medication_logs').select('*').eq('user_id', uid).gte('log_date', new Date(Date.now() - 7*86400000).toISOString().slice(0,10)),
  ]);

  /* --- Summary Stats --- */
  const statsGrid = document.getElementById('report-stats-grid');
  if (statsGrid) {
    statsGrid.innerHTML = `
      <div class="report-stat-card">
        <span class="rsc-icon" style="color:var(--primary)"><i class="ph-fill ph-activity"></i></span>
        <span class="rsc-val">${symCount || 0}</span>
        <span class="rsc-label">Total Gejala</span>
      </div>
      <div class="report-stat-card">
        <span class="rsc-icon" style="color:var(--accent)"><i class="ph-fill ph-scales"></i></span>
        <span class="rsc-val">${wCount || 0}</span>
        <span class="rsc-label">Catatan BB</span>
      </div>
      <div class="report-stat-card">
        <span class="rsc-icon" style="color:var(--success)"><i class="ph-fill ph-pill"></i></span>
        <span class="rsc-val">${medCount || 0}</span>
        <span class="rsc-label">Obat Aktif</span>
      </div>
    `;
  }

  /* --- Weight Chart --- */
  const chartWrap = document.getElementById('report-weight-chart');
  if (chartWrap) {
    if (!weights?.length) {
      chartWrap.innerHTML = '<p class="chart-empty-msg">Belum ada data berat badan</p>';
    } else {
      const last10 = weights.slice(0, 10).reverse();
      const maxW   = Math.max(...last10.map(w => parseFloat(w.weight_kg)));
      const minW   = Math.min(...last10.map(w => parseFloat(w.weight_kg)));
      const range  = maxW - minW || 1;
      chartWrap.innerHTML = last10.map(w => {
        const pct   = Math.max(20, ((parseFloat(w.weight_kg) - minW) / range) * 80 + 20);
        const short = w.recorded_date.slice(5);
        return `
          <div class="weight-bar-row">
            <span class="weight-bar-date">${short}</span>
            <div class="weight-bar-track"><div class="weight-bar-fill" style="width:${pct}%"></div></div>
            <span class="weight-bar-val">${w.weight_kg}kg</span>
          </div>`;
      }).join('');
    }
  }

  /* --- Recent Symptoms --- */
  const symList = document.getElementById('report-sym-list');
  if (symList) {
    if (!syms?.length) {
      symList.innerHTML = '<p class="chart-empty-msg">Belum ada data gejala</p>';
    } else {
      symList.innerHTML = syms.slice(0, 5).map(s => `
        <div class="report-list-item">
          <span class="rli-left">
            <i class="ph-fill ph-activity" style="color:var(--primary)"></i>
            ${s.symptom_type}
            <span class="sev-badge sev-${s.severity}">Sev. ${s.severity}</span>
          </span>
          <span class="rli-right">${formatDateTime(s.recorded_at)}</span>
        </div>
      `).join('');
    }
  }

  /* --- Med Adherence (7 hari) --- */
  const adh = document.getElementById('report-med-adherence');
  if (adh) {
    if (!meds?.length) {
      adh.innerHTML = '<p class="chart-empty-msg">Belum ada data obat</p>';
    } else {
      adh.innerHTML = '<div class="adherence-wrap">' + meds.map(m => {
        const medLogs = logs?.filter(l => l.medication_id === m.id) || [];
        const total   = (m.frequency || 1) * 7;
        const taken   = medLogs.filter(l => l.taken).length;
        const pct     = total > 0 ? Math.round((taken / total) * 100) : 0;
        return `
          <div class="adherence-item">
            <div class="adh-top">
              <span class="adh-name">${m.name}${m.dose ? ' ' + m.dose : ''}</span>
              <span class="adh-pct">${taken}/${total} (${pct}%)</span>
            </div>
            <div class="adh-track"><div class="adh-fill" style="width:${pct}%"></div></div>
          </div>`;
      }).join('') + '</div>';
    }
  }
}
