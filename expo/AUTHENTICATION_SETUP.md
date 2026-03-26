# Authentication Setup / Kimlik Doğrulama Kurulumu

## Problem / Sorun
"Invalid login credentials" hatası alıyorsunuz çünkü:
1. **Email onayı gerekli** - Supabase varsayılan olarak email onayı bekliyor
2. **Onay linkleri çalışmıyor** - Email'deki linkler `localhost:3000` içeriyor

## Solution / Çözüm

### ADIM 1: Supabase Dashboard'da Email Onayını Kapat

**EN ÖNEMLI ADIM - Bu olmadan giriş yapamazsınız!**

1. Supabase Dashboard'a git: https://supabase.com/dashboard
2. Projenizi seç: `tbpjusypaidmkeeewcpj`
3. Sol menüden **Authentication** → **Providers** seç
4. **Email** provider'ını seç
5. **"Confirm email"** seçeneğini **KAPALI (DISABLE)** yap
6. **Save** butonuna tıkla

### ADIM 2: Yeni Kullanıcı Kaydı Oluştur

Artık email onayı gerekli olmadığından:
1. Uygulamada **Sign Up** butonuna tıkla
2. Email ve şifre gir
3. Kayıt ol
4. Direkt giriş yapabilirsin! 🎉

### ADIM 3 (Opsiyonel): URL Ayarlarını Düzenle

Eğer daha sonra email onayını açmak isterseniz:

1. **Authentication** → **URL Configuration**
2. **Redirect URLs** kısmına ekle:
   ```
   https://rork.com
   exp://localhost:8081
   http://localhost:8081
   ```
3. **Site URL**: `https://rork.com`
4. **Email Templates** → Her template için redirect URL'i güncelle

---

## Common Errors / Sık Karşılaşılan Hatalar

### ❌ "Invalid login credentials"
**Sebep**: Hesap oluşmamış veya email onayı gerekli  
**Çözüm**: Yukarıdaki ADIM 1'i yap (Email onayını kapat)

### ⏱️ "For security purposes, you can only request this after 55 seconds"
**Sebep**: Rate limiting - Çok fazla deneme yaptınız  
**Çözüm**: 1 dakika bekle ve tekrar dene

### 📧 "Email not confirmed"
**Sebep**: Email onayı hala aktif  
**Çözüm**: ADIM 1'i yap - Email onayını kapat

### 🗄️ "Database boş"
**Sebep**: SQL setup dosyası çalıştırılmamış  
**Çözüm**: `SUPABASE_SETUP.md` dosyasındaki talimatları takip et

---

## Test / Test Etme

Ayarları yaptıktan sonra:
1. ✅ Yeni kullanıcı kaydı oluştur
2. ✅ Direkt giriş yapabilmelisin
3. ✅ Email onayı gerektirmeden giriş olmalı

---

## Production / Canlı Ortam İçin

Geliştirme tamamlandığında, canlı ortamda email onayını açmanız önerilir:
- Email onayını tekrar **AKTİF** et
- Redirect URL'leri gerçek domain'inize göre ayarla
- Email template'lerini özelleştir
