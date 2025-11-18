# Güvenlik Önerileri

## 🔒 Erişim Kodları Güvenliği

### Mevcut Güvenlik Özellikleri ✅
- ✅ Rate limiting (her IP için 15 dakikada 10 deneme)
- ✅ Kod kullanım limitleri (maxUses)
- ✅ Kod aktif/pasif kontrolü
- ✅ Kod süre kontrolü (expiresAt)
- ✅ JWT token ile erişim kontrolü

### Önerilen İyileştirmeler

#### 1. Production'da Seed.js Kullanmayın
```bash
# Production'da seed çalıştırmayın
# Kodları manuel olarak veya admin paneli ile ekleyin
```

#### 2. Veritabanı Güvenliği
- PostgreSQL'e sadece localhost'tan erişim ver
- Public IP'den erişimi kapat
- Güçlü şifreler kullan
- Düzenli yedekleme yap

#### 3. HTTPS Kullanın
```bash
# Nginx + Let's Encrypt SSL
sudo apt install nginx certbot
sudo certbot --nginx -d domainin.com
```

#### 4. Kodları Environment Variable'dan Oku (Opsiyonel)
Seed.js yerine kodları `.env` dosyasından okuyabilirsiniz:
```env
ACCESS_CODES=001201150,002341150,003285393
```

#### 5. Monitoring ve Logging
Şüpheli aktiviteleri loglayın:
- Başarısız kod denemeleri
- Aynı IP'den çok fazla deneme
- Kullanım limiti dolan kodlar

#### 6. Kod Formatı
- Karmaşık kodlar kullanın (rastgele 9 haneli)
- Düzenli kodları değiştirin
- Kullanılan kodları devre dışı bırakın

## 🛡️ Genel Güvenlik

1. **.env dosyasını asla commit etmeyin** ✅ (zaten .gitignore'da)
2. **JWT_SECRET'ı güçlü tutun** ✅
3. **Video dosyalarını .gitignore'da tutun** ✅
4. **Düzenli güvenlik güncellemeleri yapın**
5. **Firewall kurallarını sınırlayın** (sadece gerekli portlar)

## 📊 Risk Değerlendirmesi

| Risk | Seviye | Çözüm |
|------|--------|-------|
| Seed.js'den kod görme | Orta | Production'da seed kullanma |
| Veritabanı erişimi | Yüksek | Güçlü şifre + localhost only |
| Brute force | Düşük | Rate limiting var ✅ |
| Network sniffing | Orta | HTTPS kullan |

## ✅ Yapılması Gerekenler

1. ✅ Rate limiting eklendi
2. ⚠️ HTTPS kurulumu (yapılacak)
3. ⚠️ Veritabanı güvenliği kontrolü (yapılacak)
4. ⚠️ Production'da seed kullanmayın (unutma!)

