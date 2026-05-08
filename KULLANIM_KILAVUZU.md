# SkillBridge — Detaylı Kullanım Kılavuzu

SkillBridge, AI destekli test ve değerlendirme platformudur. Bu kılavuz, platformu konu başlıklarına göre adım adım kullanmanız için hazırlanmıştır.

---

## İçindekiler

1. [Giriş ve Hesap](#1-giriş-ve-hesap)
2. [Dashboard (Ana Panel)](#2-dashboard-ana-panel)
3. [Kontör Sistemi](#3-kontör-sistemi)
4. [Doküman İşlemleri](#4-doküman-işlemleri)
5. [Test İşlemleri](#5-test-işlemleri)
6. [Hazır Test Kütüphanesi](#6-hazır-test-kütüphanesi)
7. [Sınav (Aday) Deneyimi](#7-sınav-aday-deneyimi)
8. [Test Sonuçları ve Oturumlar](#8-test-sonuçları-ve-oturumlar)
9. [Aday İşlemleri ve Davetler](#9-aday-işlemleri-ve-davetler)
10. [Değerlendirme ve Analiz](#10-değerlendirme-ve-analiz)
11. [Karşılaştırma Araçları](#11-karşılaştırma-araçları)
12. [Yönetim Paneli (Admin)](#12-yönetim-paneli-admin)
13. [Sık Karşılaşılan Sorunlar](#13-sık-karşılaşılan-sorunlar)

---

## 1. Giriş ve Hesap

### 1.1 Ana Sayfa
- Adres: **http://localhost:3000** (veya canlı ortam URL’i)
- **Giriş Yap**: Mevcut hesabınızla giriş
- **Ücretsiz Başla**: Yeni kayıt

### 1.2 Giriş Yapma
1. **Giriş Yap** butonuna tıklayın.
2. E-posta ve şifrenizi girin.
3. Giriş başarılıysa **Dashboard** sayfasına yönlendirilirsiniz.

### 1.3 Kayıt Olma
1. **Ücretsiz Başla** veya **Kayıt Ol** bağlantısına tıklayın.
2. Ad, soyad, e-posta ve şifre alanlarını doldurun.
3. Kayıt sonrası otomatik giriş yapılıp Dashboard’a gidersiniz.

### 1.4 Şifremi Unuttum
1. Giriş sayfasında **Şifremi unuttum** bağlantısına tıklayın.
2. E-posta adresinizi girin; şifre sıfırlama bağlantısı e-posta ile gönderilir (e-posta yapılandırmasına bağlıdır).

### 1.5 Çıkış
- Sağ üstte **Çıkış** butonuna tıklayarak oturumu kapatın.

---

## 2. Dashboard (Ana Panel)

Dashboard, tüm işlemlere tek yerden eriştiğiniz ana sayfadır. Kartlar yatay sıralanır; satırın üzerine gelince kartlar açılır.

### 2.1 Dashboard Satırı
- **Kontör bakiyesi**: Mevcut kontörünüz (bireysel veya şirket havuzu).
- **Katıldığım Sınavlar**: Son testleriniz ve puanlarınız.
- **Şirket içi sıralama**: Varsa şirket içi yüzdelik diliminiz.

### 2.2 Doküman İşlemleri Satırı
- **Dokümanlar**: Doküman kütüphanesi sayfasına gider.
- **Doküman Yükle**: PDF, DOCX, TXT, PPTX yükleme paneli (sürükle-bırak veya seç).
- **Doküman Yarat**: AI ile yeni doküman oluşturma (50 kontör).
- **Vaka Analizi**: Olay/senaryo bazlı test oluşturma (50 kontör).

### 2.3 Test İşlemleri Satırı
- **Testler**: Test kütüphanesi sayfasına gider.
- **Belgeden Test Oluştur**: Kütüphanedeki bir dokümandan AI ile test üretir (50 kontör).
- **Konulardan Test Yarat**: Konu/prompt ile özel test oluşturur (50 kontör).
- **CV'ye Göre Hazırla**: CV’ye göre özelleştirilmiş test oluşturur (50 kontör).

### 2.4 Karşılaştırma Satırı
- **Görev Tanımı + CV'ler**: Bir iş tanımı (JD) ile birden fazla CV’yi karşılaştırır (10 kontör).
- **CV vs CV**: İki aday CV’sini karşılaştırır (10 kontör).
- **Test Cevapları**: İki oturumun cevaplarını karşılaştırır (10 kontör).

### 2.5 Aday İşlemleri Satırı
- **Davetler**: Davet listesi sayfasına gider.
- **Aday Davet Et**: Tek e-posta ile davet.
- **Toplu Davet**: CSV veya çoklu e-posta ile toplu davet.
- **Sınav Linki**: Paylaşılabilir test linki oluşturma.

### 2.6 Değerlendirme Satırı
- **Sonuçlar**: Tüm test oturumları/sonuçları sayfasına gider.
- **AI Analizi**: Sonucu Claude ile analiz etme.
- **360° Değerlendirme**: Çok yönlü geri bildirim.
- **CV + JD Eşleştirme**: Aday–pozisyon uyumu analizi.

### 2.7 Yönetim Satırı (Sadece Admin)
- **CORPORATE_ADMIN** veya **PLATFORM_ADMIN** rollerinde görünür.
- **Admin Panel**, **Taxonomy**, **Kullanıcılar**, **Şirket Ayarları** linkleri yer alır.

---

## 3. Kontör Sistemi

- İşlemler **kontör** ile harcanır; bakiye Dashboard’da görünür.
- **Bireysel kullanıcı**: Kendi bakiyesi.
- **Şirket yöneticisi (CORPORATE_ADMIN)**: Şirket havuzu bakiyesi.

### 3.1 Kontör Harcanan İşlemler (Örnek)
| İşlem | Kontör |
|-------|--------|
| Hazır şablondan test kullanma | Soru başına 1 |
| AI ile doküman oluşturma | 50 |
| Vaka analizi testi | 50 |
| Belgeden / konudan / CV’den test | 50 |
| Karşılaştırma (JD+CV, CV vs CV, cevaplar) | 10 |
| AI sınav analizi (sonuç yorumu) | 10 |

### 3.2 Kontör Alma
- Admin panelinden **Kontör İşlemleri** ile kullanıcıya veya şirkete kontör verilir.
- Şirket ayarları ve fatura bilgileri **Şirket Ayarları** sayfasından yönetilir.

---

## 4. Doküman İşlemleri

### 4.1 Dokümanlar Sayfası
- Menü: Dashboard → **Dokümanlar** kartı.
- Desteklenen formatlar: **PDF, DOCX, TXT, PPTX**.
- Liste: Başlık, dil, boyut, oluşturulma tarihi.
- **Ara**: Başlığa göre filtre.
- **Dil**: TR / EN / Tümü filtresi.

### 4.2 Doküman Yükleme
1. Dashboard’da **Doküman Yükle** kartına tıklayın (veya Dokümanlar sayfasındaki yükleme alanı).
2. Dosyayı sürükleyip bırakın veya **Dosya seç** ile seçin.
3. Yükleme bitince doküman kütüphanede listelenir.

### 4.3 AI ile Doküman Oluşturma
1. **Doküman Yarat** kartına tıklayın (50 kontör).
2. Konu/başlık ve isteğe bağlı açıklama girin.
3. Oluştur butonuna basın; işlem bitince doküman kütüphaneye eklenir.

### 4.4 Doküman Silme
- Dokümanlar listesinde ilgili satırdaki **Sil** ile dokümanı silebilirsiniz.

---

## 5. Test İşlemleri

### 5.1 Testler Sayfası
- Menü: Dashboard → **Testler** kartı.
- Kendi oluşturduğunuz ve kütüphaneden eklediğiniz testler listelenir.
- Her test için: başlık, soru sayısı, süre, oluşturulma tarihi, **Düzenle** / **Sil** (varsa).

### 5.2 Belgeden Test Oluşturma
1. **Belgeden Test Oluştur** kartına tıklayın (50 kontör).
2. Açılan panelde kütüphaneden bir **doküman** seçin.
3. Soru sayısı ve zorluk (isteğe bağlı) ayarlayın.
4. Oluştur’a basın; test **Testler** listesine eklenir.

### 5.3 Konulardan Test Yaratma
1. **Konulardan Test Yarat** kartına tıklayın (50 kontör).
2. Konu/prompt (ör. “JavaScript async/await”) ve soru sayısı girin.
3. Test oluşturulur ve Testler sayfasında görünür.

### 5.4 CV'ye Göre Test Hazırlama
1. **CV'ye Göre Hazırla** kartına tıklayın (50 kontör).
2. CV metnini yapıştırın veya yükleyin; sistem eğitim ve becerilere göre soru üretir.
3. Test Testler listesine eklenir.

### 5.5 Test Düzenleme ve Paylaşım
- **Testler** sayfasında bir testin **Düzenle** ile açılan sayfada:
  - Soruları görüntüleyebilir, süre ve yayın ayarlarını yapabilirsiniz.
  - **Sınav linki** (paylaşım linki) oluşturulup adaylarla paylaşılabilir.

---

## 6. Hazır Test Kütüphanesi

- Menü: **Testler** sayfasından **Hazır Test Kütüphanesi** (veya ilgili link).
- Önceden hazırlanmış **şablon testler** listelenir.

### 6.1 Şablon Önizleme
1. Bir şablonda **Önizle** butonuna tıklayın.
2. Sorular (cevap anahtarı olmadan) modal içinde açılır.
3. Hata alırsanız: Giriş yaptığınızdan ve API’nin çalıştığından emin olun; **Tekrar dene** ile yenileyin.

### 6.2 Şablonu Kullanma
1. **Bu Testi Kullan** butonuna tıklayın (soru başına 1 kontör).
2. Test kopyanız **Testler** listesine eklenir; başlık “(Kopyam)” ile gelir.
3. Bu kopyayı düzenleyebilir veya sınav linki ile paylaşabilirsiniz.

---

## 7. Sınav (Aday) Deneyimi

Aday, paylaşılan **sınav linki** ile sınava girer (giriş yapması gerekmez).

### 7.1 Sınav Linki
- Format: `http://localhost:3000/exam/[shareToken]`
- Bu linki **Sınav Linki** panelinden veya test düzenleme ekranından alıp adaya e-posta veya mesajla gönderin.

### 7.2 Sınava Girme
1. Aday linke tıklar.
2. Sayfa yüklenir; test başlığı ve sorular gelir.
3. Varsa **süre** ekranda geri sayım olarak gösterilir.

### 7.3 Soruları Cevaplama
- Çoktan seçmeli, çoklu doğru, sıralama, açık uçlu vb. soru tipleri desteklenir.
- Her cevap seçildiğinde otomatik kaydedilir.
- **İleri / Geri** ile sorular arasında gezinilir.

### 7.4 Testi Bitirme
- **Gönder** / **Bitir** butonu ile sınav tamamlanır.
- Süre dolduğunda otomatik gönderim yapılır (ayarlara bağlı).
- Tamamlanınca aday **sonuç sayfasına** (`/sessions/[sessionId]`) yönlendirilir.

---

## 8. Test Sonuçları ve Oturumlar

### 8.1 Sonuçlar Sayfası
- Menü: Dashboard → **Sonuçlar** veya **Test Sonuçlarım**.
- Tamamlanan **oturumlar** (sessions) listelenir: test adı, puan, tarih.

### 8.2 Oturum Detayı
- Listede bir oturuma tıklayın → **Oturum detay** sayfası açılır.
- Görüntülenenler:
  - Toplam puan
  - Soru bazında doğru/yanlış veya puan
  - Varsa **AI raporu** (güçlü yönler, gelişim alanları, kariyer önerileri vb.)

### 8.3 AI Analizi Talep Etme
- Oturum detayında **AI Analizi** (veya benzeri) ile ek analiz isteyebilirsiniz (10 kontör).

---

## 9. Aday İşlemleri ve Davetler

### 9.1 Tek Aday Daveti
1. **Aday Davet Et** kartına tıklayın.
2. E-posta ve isteğe bağlı test/link bilgisini girin.
3. Davet gönderilir; aday e-posta ile link alır (e-posta sunucusu yapılandırmasına bağlıdır).

### 9.2 Toplu Davet
1. **Toplu Davet** kartına tıklayın.
2. CSV yükleyin veya e-posta listesini yapıştırın.
3. Gönderim sonrası kaç davetin gittiği raporlanır.

### 9.3 Sınav Linki Paylaşımı
1. **Sınav Linki** kartına tıklayın.
2. Bir test seçin; **paylaşılabilir URL** oluşturulur.
3. Bu URL’yi kopyalayıp adaylara iletebilirsiniz.

### 9.4 Davetler Listesi
- **Davetler** kartı ile davet listesi sayfasına gidip gönderilen davetleri görüntüleyebilirsiniz.

---

## 10. Değerlendirme ve Analiz

### 10.1 AI Analizi
- **AI Analizi** kartı veya oturum detayındaki ilgili buton ile sonuç Claude ile yorumlanır (10 kontör).
- Çıktı: güçlü yönler, gelişim alanları, öneriler.

### 10.2 360° Değerlendirme
- **360° Değerlendirme** kartı ile çok yönlü geri bildirim süreci başlatılır (özellik yapılandırmasına bağlıdır).

### 10.3 CV + JD Eşleştirme
- **CV + JD Eşleştirme** ile bir iş ilanı (JD) ve aday CV’si yüklenir; uyum skoru ve analiz üretilir.

---

## 11. Karşılaştırma Araçları

### 11.1 Görev Tanımı + CV'ler
- Bir **iş tanımı (JD)** ve birden fazla **CV** girin/yükleyin.
- Sistem JD ile her CV’yi karşılaştırır (10 kontör).

### 11.2 CV vs CV
- İki **CV** girin; karşı karşıya analiz ve karşılaştırma raporu alırsınız (10 kontör).

### 11.3 Test Cevapları Karşılaştırma
- İki **oturum (session)** seçin; cevaplar karşılaştırılır (10 kontör).

---

## 12. Yönetim Paneli (Admin)

Sadece **PLATFORM_ADMIN** veya **CORPORATE_ADMIN** rolleri erişebilir.

### 12.1 Admin Ana Sayfa
- **Admin Panel** kartı veya `/admin`.
- Özet: kullanıcı sayısı, toplam verilen/harcanan kontör, net bakiye.
- Alt sayfalara linkler: Kullanıcılar, Kontör İşlemleri, Taxonomy, Şirket Ayarları.

### 12.2 Kullanıcılar
- Üye listesi, roller, bireysel kontör bakiyeleri.
- Kullanıcıya **kontör verme** (Platform Admin).

### 12.3 Kontör İşlemleri
- Kontör verme, geçmiş işlemleri inceleme.

### 12.4 Taxonomy
- Sektör, meslek, birim gibi **sınıflandırma** verilerinin yönetimi.

### 12.5 Şirket Ayarları
- Şirket profili, fatura bilgileri, şirket kontör havuzu (CORPORATE_ADMIN).

---

## 13. Sık Karşılaşılan Sorunlar

### 13.1 Önizleme Açılmıyor
- **Giriş** yapılı olmalı.
- **API** çalışıyor olmalı (örn. `npm run dev:api` veya `npx nx run api:serve`).
- Hata mesajı modal içinde gösterilir; **Tekrar dene** ile yenileyin.

### 13.2 API Hatası / CORS
- API ve web aynı anda çalışsın: Web `http://localhost:3000`, API `http://localhost:3001`.
- `.env` içinde `WEB_URL=http://localhost:3000` ve `NEXT_PUBLIC_API_URL=http://localhost:3001` olmalı.

### 13.3 Tarayıcı Açılmıyor
- Proje klasöründe: `npm run open:web` (Windows’ta varsayılan tarayıcıda açar).
- Elle: Tarayıcıda `http://localhost:3000` adresine gidin.

### 13.4 Kontör Yetmedi
- Admin’den ek kontör alın veya Şirket Ayarları üzerinden şirket havuzu yönetin.

### 13.5 401 / Giriş Gerekli
- Oturum süresi dolmuş olabilir; tekrar **Giriş Yap** yapın.
- Çerezlerin (cookie) etkin olduğundan emin olun.

### 13.6 Veritabanı / Prisma
- İlk kurulumda: `npm run db:generate` ve `npm run db:push` (veya `db:migrate`) çalıştırın.
- SQLite kullanıyorsanız `prisma/dev.db` dosyasının yazılabilir olduğundan emin olun.

---

## Hızlı Başlangıç (Özet)

1. **Çalıştırma**: `npm run dev:api` (bir terminal), `cd apps/web && npx next dev -p 3000` (ikinci terminal), `npm run open:web` (tarayıcı).
2. **Giriş**: Ana sayfadan Giriş Yap veya Ücretsiz Başla.
3. **Test**: Dashboard → Test İşlemleri → Belgeden/Konulardan/CV’den test oluştur veya Hazır Test Kütüphanesi’nden şablon kullan.
4. **Aday**: Sınav Linki ile link oluştur, adaya gönder; aday `/exam/[shareToken]` ile sınava girer.
5. **Sonuç**: Sonuçlar → oturuma tıkla → detay ve isteğe bağlı AI analizi.

Bu kılavuz, SkillBridge arayüzü ve API yapısına göre güncellenmiş özet bir kullanım rehberidir. Belirli ekranlar veya roller (ör. davet listesi sayfası, platform admin kontör akışı) proje sürümüne göre farklılık gösterebilir; güncel davranış için uygulamayı referans alınız.
