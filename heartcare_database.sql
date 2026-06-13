-- ============================================================
--  HEART CARE — Supabase SQL Schema (Fixed Version)
--  Kompatibel dengan Supabase terbaru (PostgreSQL 14+)
--
--  Perubahan dari versi sebelumnya:
--  - Ganti uuid_generate_v4() → gen_random_uuid() (built-in, tanpa ekstensi)
--  - Hapus CREATE EXTENSION uuid-ossp (tidak diperlukan)
--  - Perbaikan trigger handle_new_user dengan error handling
--  - Jalankan bagian per bagian jika masih error
-- ============================================================


-- ============================================================
--  STEP 1: BUAT TABEL PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name    TEXT        NOT NULL DEFAULT '',
  last_name     TEXT        DEFAULT '',
  phone         TEXT,
  date_of_birth DATE,
  gender        TEXT        CHECK (gender IN ('male', 'female', '') OR gender IS NULL),
  diagnosis     TEXT        CHECK (diagnosis IN ('chf','cad','afib','hypertension','other','none','') OR diagnosis IS NULL),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
--  STEP 2: BUAT TABEL SYMPTOMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.symptoms (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  symptom_type  TEXT        NOT NULL,
  severity      SMALLINT    NOT NULL CHECK (severity BETWEEN 1 AND 5),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
--  STEP 3: BUAT TABEL WEIGHT_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.weight_records (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_kg     NUMERIC(5,2) NOT NULL CHECK (weight_kg BETWEEN 20 AND 300),
  recorded_date DATE         NOT NULL DEFAULT CURRENT_DATE,
  notes         TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);


-- ============================================================
--  STEP 4: BUAT TABEL MEDICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medications (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  dose          TEXT,
  frequency     SMALLINT    NOT NULL DEFAULT 1 CHECK (frequency BETWEEN 1 AND 4),
  times         TEXT[],
  notes         TEXT,
  is_active     BOOLEAN     DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
--  STEP 5: BUAT TABEL MEDICATION_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  medication_id   UUID        NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  log_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  scheduled_time  TEXT        NOT NULL,
  taken           BOOLEAN     DEFAULT FALSE,
  taken_at        TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (medication_id, log_date, scheduled_time)
);


-- ============================================================
--  STEP 6: INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_symptoms_user_date    ON public.symptoms(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_weight_user_date      ON public.weight_records(user_id, recorded_date DESC);
CREATE INDEX IF NOT EXISTS idx_medications_user      ON public.medications(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_med_logs_user_date    ON public.medication_logs(user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_med_logs_med_date     ON public.medication_logs(medication_id, log_date DESC);


-- ============================================================
--  STEP 7: FUNCTION auto update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at    ON public.profiles;
DROP TRIGGER IF EXISTS trg_medications_updated_at ON public.medications;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
--  STEP 8: FUNCTION + TRIGGER auto create profile saat daftar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    phone,
    date_of_birth,
    gender,
    diagnosis
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name',  ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth', '')::DATE,
    NULLIF(NEW.raw_user_meta_data->>'gender', ''),
    NULLIF(NEW.raw_user_meta_data->>'diagnosis', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
--  STEP 9: ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada (hindari error duplikat)
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "symptoms_select" ON public.symptoms;
DROP POLICY IF EXISTS "symptoms_insert" ON public.symptoms;
DROP POLICY IF EXISTS "symptoms_update" ON public.symptoms;
DROP POLICY IF EXISTS "symptoms_delete" ON public.symptoms;
DROP POLICY IF EXISTS "weight_select"   ON public.weight_records;
DROP POLICY IF EXISTS "weight_insert"   ON public.weight_records;
DROP POLICY IF EXISTS "weight_update"   ON public.weight_records;
DROP POLICY IF EXISTS "weight_delete"   ON public.weight_records;
DROP POLICY IF EXISTS "medications_select" ON public.medications;
DROP POLICY IF EXISTS "medications_insert" ON public.medications;
DROP POLICY IF EXISTS "medications_update" ON public.medications;
DROP POLICY IF EXISTS "medications_delete" ON public.medications;
DROP POLICY IF EXISTS "med_logs_select" ON public.medication_logs;
DROP POLICY IF EXISTS "med_logs_insert" ON public.medication_logs;
DROP POLICY IF EXISTS "med_logs_update" ON public.medication_logs;
DROP POLICY IF EXISTS "med_logs_delete" ON public.medication_logs;

-- profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- symptoms
CREATE POLICY "symptoms_select" ON public.symptoms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "symptoms_insert" ON public.symptoms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "symptoms_update" ON public.symptoms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "symptoms_delete" ON public.symptoms FOR DELETE USING (auth.uid() = user_id);

-- weight_records
CREATE POLICY "weight_select" ON public.weight_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "weight_insert" ON public.weight_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weight_update" ON public.weight_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "weight_delete" ON public.weight_records FOR DELETE USING (auth.uid() = user_id);

-- medications
CREATE POLICY "medications_select" ON public.medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "medications_insert" ON public.medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medications_update" ON public.medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "medications_delete" ON public.medications FOR DELETE USING (auth.uid() = user_id);

-- medication_logs
CREATE POLICY "med_logs_select" ON public.medication_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "med_logs_insert" ON public.medication_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "med_logs_update" ON public.medication_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "med_logs_delete" ON public.medication_logs FOR DELETE USING (auth.uid() = user_id);


-- ============================================================
--  SELESAI!
--  Cek tabel di: Supabase → Table Editor
-- ============================================================
