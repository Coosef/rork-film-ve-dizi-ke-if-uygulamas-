-- Supabase Database Setup
-- Bu SQL komutlarını Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. Profiles tablosu (kullanıcı profilleri)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  favorite_genres INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Interactions tablosu (kullanıcının film/dizi etkileşimleri)
CREATE TABLE IF NOT EXISTS public.interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  media_id INTEGER NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'tv')),
  type TEXT NOT NULL CHECK (type IN ('watchlist', 'watched', 'watching', 'favorite', 'skipped')),
  rating NUMERIC CHECK (rating >= 0 AND rating <= 10),
  note TEXT,
  watch_progress JSONB,
  review JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, media_id, media_type)
);

-- 3. Preferences tablosu (kullanıcı tercihleri)
CREATE TABLE IF NOT EXISTS public.preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE NOT NULL,
  theme TEXT DEFAULT 'dark',
  content_language TEXT DEFAULT 'tr-TR',
  ui_language TEXT DEFAULT 'tr',
  age_restriction BOOLEAN DEFAULT false,
  auto_play_trailers BOOLEAN DEFAULT false,
  haptics_enabled BOOLEAN DEFAULT true,
  favorite_genres INTEGER[],
  has_completed_onboarding BOOLEAN DEFAULT false,
  has_seen_backup_warning BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Search History tablosu (arama geçmişi)
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Row Level Security (RLS) politikaları
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Profiles politikaları
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Interactions politikaları
DROP POLICY IF EXISTS "Users can view their own interactions" ON public.interactions;
CREATE POLICY "Users can view their own interactions"
  ON public.interactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own interactions" ON public.interactions;
CREATE POLICY "Users can insert their own interactions"
  ON public.interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own interactions" ON public.interactions;
CREATE POLICY "Users can update their own interactions"
  ON public.interactions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own interactions" ON public.interactions;
CREATE POLICY "Users can delete their own interactions"
  ON public.interactions FOR DELETE
  USING (auth.uid() = user_id);

-- Preferences politikaları
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.preferences;
CREATE POLICY "Users can view their own preferences"
  ON public.preferences FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.preferences;
CREATE POLICY "Users can insert their own preferences"
  ON public.preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON public.preferences;
CREATE POLICY "Users can update their own preferences"
  ON public.preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Search History politikaları
DROP POLICY IF EXISTS "Users can view their own search history" ON public.search_history;
CREATE POLICY "Users can view their own search history"
  ON public.search_history FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own search history" ON public.search_history;
CREATE POLICY "Users can insert their own search history"
  ON public.search_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own search history" ON public.search_history;
CREATE POLICY "Users can delete their own search history"
  ON public.search_history FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Triggers (otomatik profil ve preferences oluşturma)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  INSERT INTO public.preferences (user_id, ui_language)
  VALUES (NEW.id, 'tr');
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$func$;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. İndeksler (performans için)
CREATE INDEX IF NOT EXISTS interactions_user_id_idx ON public.interactions(user_id);
CREATE INDEX IF NOT EXISTS interactions_media_id_idx ON public.interactions(media_id);
CREATE INDEX IF NOT EXISTS interactions_type_idx ON public.interactions(type);
CREATE INDEX IF NOT EXISTS preferences_user_id_idx ON public.preferences(user_id);
CREATE INDEX IF NOT EXISTS search_history_user_id_idx ON public.search_history(user_id);
CREATE INDEX IF NOT EXISTS search_history_created_at_idx ON public.search_history(created_at DESC);
