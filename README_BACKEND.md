# Video Kurs Satış Sistemi - Backend

Bu backend sistemi, video kurs satışı için güvenli bir API sağlar. Videoların çalınmasını önlemek için token-based authentication ve erişim kontrolü kullanır.

## 🚀 Kurulum

1. **Bağımlılıkları yükleyin:**
```bash
npm install
```

2. **Environment dosyasını oluşturun:**
```bash
cp .env.example .env
```

3. **`.env` dosyasını düzenleyin:**
- `JWT_SECRET`: Güçlü bir secret key belirleyin (en az 32 karakter)
- `PORT`: Backend portu (varsayılan: 3000)

4. **Video klasörünü oluşturun:**
```bash
mkdir videos
```

5. **Video dosyalarını ekleyin:**
- Video dosyalarınızı `videos/` klasörüne koyun
- Dosya isimleri kurs tanımındaki `videoFiles` array'inde belirtilmelidir

## 📋 API Endpoints

### Kimlik Doğrulama

#### Kullanıcı Kaydı
```
POST /api/register
Body: {
  "email": "user@example.com",
  "password": "password123",
  "name": "Kullanıcı Adı"
}
```

#### Kullanıcı Girişi
```
POST /api/login
Body: {
  "email": "user@example.com",
  "password": "password123"
}
Response: {
  "token": "JWT_TOKEN",
  "user": { ... }
}
```

### Kurslar

#### Tüm Kursları Listele
```
GET /api/courses
```

#### Kurs Detayı
```
GET /api/courses/:courseId
```

### Video Streaming (Korumalı)

#### Video İzleme
```
GET /api/courses/:courseId/videos/:videoFile
Headers: {
  "Authorization": "Bearer JWT_TOKEN"
}
```

**Önemli:** Bu endpoint sadece kursu satın almış kullanıcılar için çalışır.

### Satın Alma

#### Kurs Satın Al
```
POST /api/purchase
Headers: {
  "Authorization": "Bearer JWT_TOKEN"
}
Body: {
  "courseId": 1,
  "paymentMethod": "credit_card"
}
```

#### Kullanıcının Kursları
```
GET /api/my-courses
Headers: {
  "Authorization": "Bearer JWT_TOKEN"
}
```

## 🔒 Güvenlik Özellikleri

1. **JWT Token Authentication**: Tüm korumalı endpoint'ler token gerektirir
2. **Erişim Kontrolü**: Sadece satın alan kullanıcılar videolara erişebilir
3. **Rate Limiting**: API abuse'i önlemek için rate limiting
4. **Video Koruması**: Video dosyaları public erişimden korunur
5. **Range Request Desteği**: Video oynatma için HTTP range request desteği

## 📝 Notlar

- **Veritabanı**: Şu anda in-memory array kullanılıyor. Production'da PostgreSQL veya MongoDB kullanın.
- **Ödeme Entegrasyonu**: `purchase` endpoint'inde ödeme sağlayıcınızı (iyzico, paytr, stripe) entegre edin.
- **Video Depolama**: Büyük video dosyaları için AWS S3, Cloudflare Stream gibi servisler kullanılabilir.
- **DRM**: Daha güçlü koruma için DRM (Digital Rights Management) eklenebilir.

## 🎯 İyileştirme Önerileri

1. **Veritabanı Entegrasyonu**: PostgreSQL/MongoDB ekleyin
2. **Video CDN**: Cloudflare Stream, AWS CloudFront kullanın
3. **Watermarking**: Videolara kullanıcıya özel watermark ekleyin
4. **Analytics**: Video izleme istatistikleri toplayın
5. **Email Notifications**: Satın alma sonrası email gönderin

## 🐛 Sorun Giderme

- **Video oynatılmıyor**: Video dosyasının `videos/` klasöründe olduğundan emin olun
- **403 Forbidden**: Kullanıcının kursu satın aldığından emin olun
- **401 Unauthorized**: Token'ın geçerli olduğundan emin olun

