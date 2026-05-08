# SkillBridge – Kurulum Rehberi (Windows)

Bu rehber, SkillBridge web ve API’sini yerelde çalıştırmak için gereken adımları anlatır.

---

## 1. Gereksinimler

- **Node.js** 18+ (https://nodejs.org)
- **PostgreSQL** 14+ (veritabanı)
- **npm** (Node ile gelir)

---

## 2. PostgreSQL Kurulumu ve Çalıştırma

### PostgreSQL yüklü değilse

1. https://www.postgresql.org/download/windows/ adresinden Windows için indir.
2. Kurulumda **şifre** belirle (örn: `password`). Bu şifreyi `.env` dosyasında kullanacaksın.
3. Kurulum sonunda **pgAdmin** veya **Command Line Tools** ile veritabanı oluşturabilirsin.

### Veritabanı oluşturma

1. **pgAdmin** ile: Yeni veritabanı oluştur, adı: `skillbridge`
2. **Komut satırı** ile (PostgreSQL’in `bin` klasörü PATH’teyse):
   ```bash
   psql -U postgres -c "CREATE DATABASE skillbridge;"
   ```

### PostgreSQL servisinin çalıştığından emin ol

- **Windows:** Hizmetler’de (services.msc) “postgresql-x64-…” servisini “Çalışıyor” yap.
- Kurulumda “Launch Stack Builder” atlandıysa, PostgreSQL’i tekrar başlatmak için bilgisayarı yeniden başlatmak veya Hizmetler’den servisi başlatmak gerekir.

---

## 3. Proje Ayarları

1. **skillbridge** klasörüne gir:
   ```bash
   cd c:\Users\bilge\OneDrive\Belgeler\SkillBridge\skillbridge
   ```

2. **.env** dosyasını kontrol et. Veritabanı satırı şöyle olmalı (şifreyi kendi belirlediğinle değiştir):
   ```
   DATABASE_URL="postgresql://postgres:password@localhost:5432/skillbridge"
   ```

3. Bağımlılıkları yükle (henüz yapmadıysan):
   ```bash
   npm install
   ```

---

## 4. Veritabanı Şeması ve Örnek Veri

Aynı **skillbridge** klasöründe:

```bash
npm run db:generate
npm run db:push
npm run db:seed
```

- `db:generate` – Prisma client üretir  
- `db:push` – Tabloları veritabanında oluşturur  
- `db:seed` – Örnek kullanıcıları ve verileri ekler  

Seed sonrası kullanabileceğin hesaplar:

| Rol              | E-posta               | Şifre        |
|------------------|------------------------|--------------|
| Platform Admin   | admin@skillbridge.io   | Admin123!    |
| Bireysel         | user@skillbridge.io    | User123!     |
| Kurumsal Admin   | kurumsal@skillbridge.io| Kurumsal123! |

---

## 5. Uygulamayı Çalıştırma

İki ayrı terminal aç (her ikisinde de `skillbridge` klasöründe ol).

**Terminal 1 – API (port 3001):**
```bash
npm run dev:api
```
*(Bazı Nx sürümlerinde `serve` yoksa: `npx nx serve api`)*

**Terminal 2 – Web (port 3000):**
```bash
npx nx dev web
```

Tarayıcıda aç: **http://localhost:3000**

Giriş için: `user@skillbridge.io` / `User123!`

---

## 6. Sık Karşılaşılan Hatalar

| Hata / Belirti | Olası neden | Çözüm |
|----------------|-------------|--------|
| **Sunucu hatası** (kayıt/giriş) | PostgreSQL çalışmıyor veya bağlantı bilgisi yanlış | Servisi başlat, `.env` içinde `DATABASE_URL`’i kontrol et |
| **HTTP 404** | Yanlış adres | Web için `http://localhost:3000`, API health için `http://localhost:3001/api/health` kullan |
| **ECONNREFUSED** (log’da) | Veritabanına bağlanılamıyor | PostgreSQL’in 5432 portunda çalıştığını ve `skillbridge` veritabanının var olduğunu kontrol et |

---

## 7. Özet Komut Listesi

```bash
cd c:\Users\bilge\OneDrive\Belgeler\SkillBridge\skillbridge
npm install
npm run db:generate
npm run db:push
npm run db:seed
# Terminal 1:
npm run dev:api
# Terminal 2:
npx nx dev web
```

Ardından tarayıcıda **http://localhost:3000** adresine gidip giriş yapabilirsin.
