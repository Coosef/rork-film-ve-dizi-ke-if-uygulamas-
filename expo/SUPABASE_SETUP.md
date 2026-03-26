# Supabase Kurulum Talimatları

## 1. Database Tablolarını Oluşturma

1. Supabase Dashboard'a gidin: https://supabase.com/dashboard
2. Projenizi seçin (tbpjusypaidmkeeewcpj)
3. Sol menüden **SQL Editor** seçin
4. **New Query** butonuna tıklayın
5. `supabase-setup.sql` dosyasındaki tüm SQL kodunu kopyalayıp yapıştırın
6. **Run** butonuna tıklayın

Bu işlem şu tabloları oluşturacak:
- `profiles` - Kullanıcı profil bilgileri
- `library` - Film/dizi kütüphanesi
- `preferences` - Kullanıcı tercihleri

## 2. Authentication Ayarları

### Email Redirect URLs (E-posta Yönlendirme URL'leri)

1. Supabase Dashboard'da **Authentication** > **URL Configuration** bölümüne gidin
2. **Redirect URLs** kısmına aşağıdaki URL'leri ekleyin:

```
https://rork.com/auth/callback
moviq://auth/callback
exp://localhost:8081/--/auth/callback
http://localhost:8081/auth/callback
```

3. **Site URL** kısmını şu şekilde ayarlayın:
```
https://rork.com
```

### Email Templates (E-posta Şablonları)

1. **Authentication** > **Email Templates** bölümüne gidin
2. Her bir şablon için (Confirm signup, Magic Link, Change Email, Reset Password):
   - **Redirect URL** kısmını kontrol edin
   - Web için: `https://rork.com/auth/callback`
   - Mobile için: `moviq://auth/callback`

## 3. OAuth Providers (Opsiyonel)

### Google OAuth

1. **Authentication** > **Providers** > **Google** 
2. **Enabled** seçeneğini aktif edin
3. Google Cloud Console'dan aldığınız:
   - Client ID
   - Client Secret
   ekleyin
4. **Authorized redirect URIs** listesine ekleyin:
   ```
   https://tbpjusypaidmkeeewcpj.supabase.co/auth/v1/callback
   ```

### Apple OAuth

1. **Authentication** > **Providers** > **Apple**
2. **Enabled** seçeneğini aktif edin
3. Apple Developer'dan aldığınız bilgileri girin

## 4. app.json Güncelleme

`app.json` dosyasındaki `scheme` değerini kontrol edin:
```json
{
  "expo": {
    "scheme": "moviq"
  }
}
```

## 5. Test Etme

Ayarları yaptıktan sonra:

1. Yeni bir kullanıcı kaydı oluşturun
2. E-postanızı kontrol edin
3. Doğrulama linkine tıklayın
4. Uygulama otomatik olarak açılmalı

## Sorun Giderme

### "localhost:3000" hatası
- Supabase Dashboard'daki Redirect URLs'leri kontrol edin
- Email Templates'deki redirect URL'leri güncelleyin

### "Rate limit" hatası
- 60 saniye bekleyin ve tekrar deneyin
- Supabase'in rate limit koruması aktif

### Database boş görünüyor
- SQL Editor'de `supabase-setup.sql` dosyasını çalıştırdığınızdan emin olun
- **Table Editor** kısmından tabloları kontrol edin

## Güvenlik Notları

- Row Level Security (RLS) aktif - kullanıcılar sadece kendi verilerini görebilir
- API Keys güvenli - anon key sadece public işlemler için
- Service role key'i asla client tarafında kullanmayın
