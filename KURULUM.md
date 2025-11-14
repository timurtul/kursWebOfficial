# Video Kurs Sistemi - Hızlı Başlangıç

## 🚀 Kurulum Adımları

### 1. Backend Kurulumu

```bash
# Bağımlılıkları yükle
npm install

# Environment dosyası zaten oluşturuldu (.env)
# İsterseniz JWT_SECRET'ı daha güçlü bir değerle değiştirebilirsiniz
# Örnek: JWT_SECRET=çok-güçlü-ve-uzun-bir-secret-key-en-az-32-karakter-123456789
```

### 2. Video Klasörünü Oluştur

```bash
mkdir videos
```

### 3. Video Dosyalarını Ekle

Video dosyalarınızı `videos/` klasörüne koyun. Örnek:
- `module1.mp4`
- `module2.mp4`
- `module3.mp4`
- `module4.mp4`

**Önemli:** Dosya isimleri `server.js` içindeki `courses` array'indeki `videoFiles` ile eşleşmeli.

### 4. Backend'i Başlat

```bash
# Development mode (otomatik yeniden başlatma)
npm run dev

# Production mode
npm start
```

Backend `http://localhost:3000` adresinde çalışacak.

### 5. Frontend'i Test Et

`index.html` dosyasını tarayıcıda açın ve test edin.

## 🔒 Video Koruma Özellikleri

### Nasıl Çalışıyor?

1. **Token-Based Authentication**: Kullanıcılar JWT token ile kimlik doğrulanır
2. **Erişim Kontrolü**: Sadece kursu satın alan kullanıcılar videolara erişebilir
3. **Güvenli Streaming**: Video dosyaları doğrudan erişilemez, sadece backend üzerinden stream edilir
4. **Range Request Desteği**: Video oynatıcılar için HTTP range request desteği

### Video Çalınmasını Önleme Yöntemleri

#### ✅ Şu An Uygulananlar:
- Token-based authentication
- Backend'de erişim kontrolü
- Video dosyaları public erişimden korunur
- Sadece satın alan kullanıcılar erişebilir

#### 🔧 Eklenebilecek İyileştirmeler:

1. **Signed URLs (Zaman Sınırlı)**
   ```javascript
   // Video URL'leri sadece belirli bir süre için geçerli olabilir
   const signedUrl = generateSignedUrl(videoPath, expiresIn: '1h');
   ```

2. **Watermarking**
   - Videolara kullanıcıya özel watermark ekle
   - Kullanıcı email'i veya ID'si videoda görünsün

3. **DRM (Digital Rights Management)**
   - Widevine, FairPlay gibi DRM sistemleri
   - Daha güçlü koruma (ücretli servisler)

4. **Video CDN ile Koruma**
   - Cloudflare Stream
   - AWS CloudFront + Signed URLs
   - Mux Video

5. **Screen Recording Tespiti**
   - Ekran kaydı tespit eden JavaScript kütüphaneleri
   - (Tam koruma sağlamaz ama caydırıcı olur)

## 📝 Test Senaryoları

### 1. Kullanıcı Kaydı
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "name": "Test User"
  }'
```

### 2. Giriş Yap
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123"
  }'
```

### 3. Kurs Satın Al
```bash
curl -X POST http://localhost:3000/api/purchase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "courseId": 1
  }'
```

### 4. Video İzle
```bash
curl http://localhost:3000/api/courses/1/videos/module1.mp4 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output video.mp4
```

## ⚠️ Önemli Notlar

1. **Production'da:**
   - Güçlü bir JWT_SECRET kullanın
   - HTTPS kullanın
   - Veritabanı ekleyin (PostgreSQL/MongoDB)
   - Rate limiting ayarlarını optimize edin
   - Video dosyalarını CDN'de saklayın

2. **Güvenlik:**
   - Video dosyaları `.gitignore`'da olmalı
   - Environment variables asla commit edilmemeli
   - CORS ayarlarını production'da sınırlayın

3. **Performans:**
   - Büyük video dosyaları için CDN kullanın
   - Video compression yapın
   - HLS/DASH streaming formatı kullanın

## 🐛 Sorun Giderme

**Video oynatılmıyor:**
- Video dosyasının `videos/` klasöründe olduğundan emin olun
- Dosya isminin kurs tanımındaki ile eşleştiğinden emin olun
- Browser console'da hata mesajlarını kontrol edin

**403 Forbidden:**
- Kullanıcının kursu satın aldığından emin olun
- Token'ın geçerli olduğundan emin olun

**CORS Hatası:**
- Backend'de CORS ayarlarını kontrol edin
- Frontend URL'ini CORS whitelist'e ekleyin

## 📚 İleri Seviye

Daha fazla bilgi için `README_BACKEND.md` dosyasına bakın.

