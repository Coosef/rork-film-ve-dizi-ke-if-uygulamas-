-- Supabase Database Setup
-- Bu SQL komutlarını Supabase Dashboard > SQL Editor'de çalıştırın

-- 1. Profiles tablosu (kullanıcı profilleri)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  favorite_genres TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Library tablosu (kullanıcının film/dizi kütüphanesi)
CREATE TABLE IF NOT EXISTS public.library (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL, -- 'movie' veya 'tv'
  status TEXT NOT NULL, -- 'watched', 'watchlist', 'watching'
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  notes TEXT,
  watched_date TIMESTAMP WITH TIME ZONE,
  added_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id, item_type)
);

-- 3. Preferences tablosu (kullanıcı tercihleri)
CREATE TABLE IF NOT EXISTS public.preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE NOT NULL,
  language TEXT DEFAULT 'en',
  theme TEXT DEFAULT 'auto',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Row Level Security (RLS) politikaları
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Profiles politikaları
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Library politikaları
CREATE POLICY "Users can view their own library"
  ON public.library FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own library"
  ON public.library FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own library"
  ON public.library FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own library"
  ON public.library FOR DELETE
  USING (auth.uid() = user_id);

-- Preferences politikaları
CREATE POLICY "Users can view their own preferences"
  ON public.preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON public.preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON public.preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Triggers (otomatik profil ve preferences oluşturma)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  
  INSERT INTO public.preferences (user_id, language)
  VALUES (NEW.id, 'en');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. İndeksler (performans için)
CREATE INDEX IF NOT EXISTS library_user_id_idx ON public.library(user_id);
CREATE INDEX IF NOT EXISTS library_item_id_idx ON public.library(item_id);
CREATE INDEX IF NOT EXISTS library_status_idx ON public.library(status);
CREATE INDEX IF NOT EXISTS preferences_user_id_idx ON public.preferences(user_id);
