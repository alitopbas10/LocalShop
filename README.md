# LocalShop

Yerel üreticilerin ürünlerini doğrudan müşterilere sattığı marketplace MVP'si.
İki kullanıcı rolü: customer ve seller.

## Teknolojiler

**Backend**

- Node.js + Express 5
- TypeScript 6 (strict mod)
- Mongoose 9
- Zod 4 (validasyon ve environment konfigürasyonu)
- dotenv, cors, helmet, morgan, tsconfig-paths

**Frontend**

- React 19
- TypeScript 6
- Vite 8
- React Router 7
- styled-components 6
- Axios 1

## Proje Yapısı

```
LocalShop/
├── backend/          # Express API sunucusu
├── frontend/         # React SPA
└── docs/             # Proje dokümantasyonu
```

**backend/src/**

```
src/
├── config/           # env doğrulama (Zod) ve veritabanı bağlantı kurulumu
├── middlewares/       # Express middleware'leri
├── shared/            # modüller arası paylaşılan yardımcılar (AppError, asyncHandler vb.)
├── modules/           # feature-folder yapısı — her feature kendi routes/controller/service/model/schema dosyalarını barındırır
├── app.ts             # Express app kurulumu (middleware zinciri, /health, 404 handler) — port dinlemez
└── server.ts          # bootstrap: DB bağlantısı + listen + graceful shutdown
```

`config`, `middlewares`, `shared` ve `modules` birbirinden ayrıdır: `config` uygulama açılışında
bir kez çalışan kurulum kodunu (env, DB) barındırır; `middlewares` istek/yanıt döngüsüne giren
Express middleware'lerini içerir; `shared` birden fazla modülün ortak kullandığı, iş kuralı
içermeyen yardımcı kodu (hata sınıfları, tipler, wrapper'lar) tutar; `modules` ise her biri
kendi route/controller/service/model'ine sahip, birbirinden bağımsız feature klasörlerini
barındırır.

**frontend/src/**

```
src/
├── components/        # paylaşılan, sayfadan bağımsız UI bileşenleri
├── features/          # sayfa/özellik bazlı bileşenler
├── services/           # API çağrı katmanı (axios)
├── hooks/              # paylaşılan custom hook'lar
├── context/            # React context sağlayıcıları
├── styles/             # theme, GlobalStyle, styled-components tip genişletmesi
├── types/              # paylaşılan TypeScript tipleri
├── utils/              # genel yardımcı fonksiyonlar
├── App.tsx
└── main.tsx
```

## Gereksinimler

- Node.js 20+
- npm 10+
- MongoDB Atlas hesabı (ücretsiz M0 yeterli)

## Kurulum

1. Repoyu klonla:

   ```bash
   git clone <repo-url>
   cd LocalShop
   ```

2. MongoDB Atlas kurulumu:
   - Ücretsiz M0 cluster oluştur
   - Database Access'ten kullanıcı tanımla (`readWriteAnyDatabase`)
   - Network Access'ten geliştirme için `0.0.0.0/0` izni ver

     > **Uyarı:** `0.0.0.0/0` ayarı **sadece geliştirme** içindir. Production'da sabit IP
     > allowlist veya VPC peering ile daraltılmalıdır.

   - Connect > Drivers > Node.js yolundan connection string'i al
   - Connection string'de veritabanı adının bulunması **zorunludur**:
     `.mongodb.net/localshop?...` şeklinde olmalı. Aksi halde veriler `test` veritabanına yazılır.

3. `backend/.env.example` dosyasını `backend/.env` olarak kopyala ve doldur:

   ```bash
   cp backend/.env.example backend/.env
   ```

4. Backend'i kur ve çalıştır:

   ```bash
   cd backend
   npm install
   npm run dev
   ```

5. Frontend'i kur ve çalıştır:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. Doğrulama:
   - Backend: [http://localhost:5000/health](http://localhost:5000/health)
   - Frontend: [http://localhost:5173](http://localhost:5173)

## Mimari

- **Feature-folder yapısı**: her özellik (`modules/<feature>/`) kendi route, controller,
  service, model ve schema dosyalarını bir arada tutar; özellikler arası bağımlılık en aza
  indirilir ve yeni bir özellik eklemek tek bir klasöre dokunmak anlamına gelir.
- **controller → service → model** sorumluluk ayrımı: controller yalnızca HTTP katmanını
  (request/response, status code) yönetir, iş kuralları service'te yaşar, veri erişimi
  model'e hapsedilir — hiçbir katman bir üsttekinin işini yapmaz.
- **Merkezi hata yönetimi ve standart response zarfı**: tüm hatalar `AppError` ile fırlatılır ve
  tek bir error middleware'de yakalanır; başarılı/başarısız tüm response'lar aynı zarf
  formatını (`{ success, data }` / `{ success, error }`) kullanır.
- **Zod ile tipli environment konfigürasyonu**: `process.env` uygulama boyunca
  `string | undefined` olarak dolaşmaz — açılışta bir kez valide edilir, eksik/hatalı
  değişken varsa uygulama fail-fast şekilde anlaşılır bir hatayla kapanır.
- **Neden yönetilen replica set**: sipariş oluşturma akışında ("stok düş + order yarat +
  sepeti temizle") MongoDB transaction kullanılacak; transaction desteği yalnızca replica set
  üzerinde çalışır, MongoDB Atlas M0 cluster'ları bunu yönetilen şekilde hazır sağlar.

## Kimlik Doğrulama

**Akış:** Kullanıcı `POST /api/auth/register` veya `POST /api/auth/login` ile bir JWT
access token alır. Bu token, korumalı endpoint'lere yapılan her istekte
`Authorization: Bearer <token>` header'ı ile gönderilir.

### Roller ve Yetkiler

| Rol        | Yetkiler                                                                 |
| ---------- | ------------------------------------------------------------------------ |
| `customer` | Ürünleri görüntüler, sepete ekler, sipariş oluşturur                     |
| `seller`   | Ürün ekler/düzenler, kendi ürünlerine ait siparişleri yönetir            |

### Endpoint'ler

| Method | Endpoint             | Açıklama                                    | Yetki         |
| ------ | --------------------- | -------------------------------------------- | ------------- |
| POST   | `/api/auth/register` | Yeni kullanıcı kaydı                         | Herkese açık  |
| POST   | `/api/auth/login`    | Giriş yapar, JWT access token döner          | Herkese açık  |
| GET    | `/api/auth/me`       | Giriş yapmış kullanıcının bilgisini döner    | `authenticate` |

### Bilinçli Kapsam Kararları

- **Refresh token uygulanmadı.** Gerekçe: doğru bir refresh akışı token rotasyonu, iptal
  listesi (revocation list) ve yeniden kullanım tespiti (reuse detection) gerektirir; MVP
  kapsamında bunu yarım uygulamak, hiç uygulamamaktan güvenlik açısından daha kötüdür. Bunun
  yerine 1 gün ömürlü (`JWT_EXPIRES_IN=1d`) bir access token kullanıldı.
- **Alınan güvenlik önlemleri:**
  - bcrypt ile şifre hash'leme (12 salt round)
  - User enumeration koruması — login ve register hata mesajları e-posta adresini veya
    kullanıcının var olup olmadığını ele vermez
  - Timing attack koruması — login'de kullanıcı bulunamasa bile sabit bir hash'e karşı
    bcrypt karşılaştırması çalıştırılır, böylece yanıt süresi kullanıcı varlığına göre
    değişmez
  - JWT algorithm pinning — doğrulamada yalnızca `HS256` kabul edilir, `alg: none`
    (algorithm confusion) saldırısına kapalı
  - Auth endpoint'lerinde rate limiting (`express-rate-limit`)
  - Şifre alanında `select: false` — sorgular şifreyi varsayılan olarak getirmez

## Ürün Yönetimi

**Akış:** Seller, kendi ürünlerini `/api/seller/products` altındaki endpoint'ler üzerinden
yönetir. Bu endpoint'lerin tamamı `authenticate` ve `authorize("seller")` ile korunur; ayrıca
her istek, ilgili ürünün gerçekten o seller'a ait olduğunu service katmanında doğrular.

### Endpoint'ler

| Method | Endpoint                             | Açıklama                                          | Gerekli Rol |
| ------ | ------------------------------------- | -------------------------------------------------- | ----------- |
| POST   | `/api/seller/products`               | Yeni ürün oluşturur                                | `seller`    |
| GET    | `/api/seller/products`               | Kendi ürünlerini listeler (sayfalama, filtre, sıralama) | `seller`    |
| GET    | `/api/seller/products/:id`           | Kendi ürününün detayını getirir                    | `seller`    |
| PATCH  | `/api/seller/products/:id`           | Ürünü günceller (partial — sadece gönderilen alanlar) | `seller`    |
| DELETE | `/api/seller/products/:id`           | Ürünü pasifleştirir (soft delete)                  | `seller`    |
| PATCH  | `/api/seller/products/:id/activate`  | Pasifleştirilmiş ürünü tekrar aktive eder          | `seller`    |

### Ürün Kategorileri

`food`, `beverage`, `handcraft`, `textile`, `cosmetics`, `home`, `other`

### Tasarım Kararları

- **Soft delete kullanılır (`isActive: false`), fiziksel silme yapılmaz.** Gerekçe: bir ürün
  gerçekten silinirse, o ürünü içeren sepetler ve geçmiş sipariş kayıtları referans
  bütünlüğünü kaybeder (var olmayan bir ürüne işaret ederler). `isActive: false` ürünü
  yalnızca katalogdan/aramadan gizler, geçmiş veriyi bozmadan.
- **`/api/seller/products` ve `/api/products` ayrı yollardır.** `/api/products`, Faz 4'te
  eklenen customer'a açık kataloğu barındırır (bkz. [Ürün Kataloğu](#ürün-kataloğu)). Aynı
  yolu kullanıp rol bazlı dallanmak (ör. "eğer seller ise kendi ürünlerini, customer ise tüm
  aktif ürünleri göster") hem route mantığını hem yetkilendirmeyi bulanıklaştırır. Ayrı yol,
  ayrı sorumluluk anlamına gelir: biri satıcının kendi yönetim ekranı, diğeri herkese açık
  katalog.
- **Sahiplik kontrolü, rol kontrolünden ayrı bir katmandır.** `authorize("seller")` yalnızca
  isteği yapanın bir seller olduğunu doğrular; isteği yapan seller'ın *bu spesifik ürünün*
  sahibi olduğunu doğrulamaz. Bu ikinci kontrol service katmanında (`sellerId === req.user.id`)
  ayrıca yapılır — atlanırsa bir seller başka bir seller'ın ürününü düzenleyebilir/pasifleştirebilir
  (klasik IDOR açığı).
- **Fiyat `Number` tipinde saklanır.** Bu, bilinçli bir MVP kısıtıdır: kayan noktalı sayılarla
  (floating point) toplama/çıkarma yapıldığında yuvarlama hataları oluşabilir. Production'a
  taşınırken tutarı kuruş cinsinden tam sayı (`priceInCents: number`) veya Mongoose'un
  `Decimal128` tipiyle saklamak tercih edilecektir.
- **`imageUrl` alanı case study modelinin bir parçası değildir**, katalog görünümü görselsiz
  çok zayıf kalacağı için opsiyonel bir alan olarak sonradan eklenmiştir.

## Ürün Kataloğu

**Akış:** Customer, `/api/products` altındaki endpoint'ler üzerinden herkese açık kataloğu
görüntüler. Bu endpoint'ler kimlik doğrulaması gerektirmez; yalnızca aktif (`isActive: true`)
ürünler listelenir ve döndürülür.

### Endpoint'ler

| Method | Endpoint                  | Açıklama                                         | Yetki        |
| ------ | -------------------------- | -------------------------------------------------- | ------------ |
| GET    | `/api/products`            | Aktif ürünleri listeler (sayfalama, filtre, arama, sıralama) | Herkese açık |
| GET    | `/api/products/:id`        | Aktif bir ürünün detayını getirir                  | Herkese açık |
| GET    | `/api/products/categories` | Her kategorideki aktif ürün sayısını döndürür      | Herkese açık |

### Query Parametreleri

| Parametre  | Tip    | Varsayılan                                      | Örnek              |
| ---------- | ------ | ------------------------------------------------ | ------------------ |
| `page`     | number | `1`                                               | `page=2`            |
| `limit`    | number | `20`                                              | `limit=10`          |
| `category` | string | —                                                  | `category=food`     |
| `search`   | string | —                                                  | `search=honey`      |
| `minPrice` | number | —                                                  | `minPrice=50`       |
| `maxPrice` | number | —                                                  | `maxPrice=200`      |
| `sort`     | string | `search` verilmişse `relevance`, yoksa `newest`    | `sort=priceAsc`     |

`sort` için geçerli değerler: `newest`, `priceAsc`, `priceDesc`, `relevance` (yalnızca
`search` ile birlikte kullanılabilir).

### Örnek İstekler

```bash
GET /api/products
GET /api/products/:id
GET /api/products?category=food
GET /api/products?search=honey
```

### Tasarım Kararları

- **Arama için MongoDB text index kullanıldı, regex değil.** Gerekçe: text index kelime
  bazlı bir ters indeks üzerinde çalışır ve MongoDB'nin sorgu planlayıcısı tarafından
  kullanılabilir; regex (`$regex`) ile arama ise büyük koleksiyonlarda index kullanamaz
  ve her istekte tüm koleksiyonu tarar (collection scan). Text index ayrıca alaka puanı
  (`textScore`) üretir, bu da `relevance` sıralamasını mümkün kılar — regex ile eşit
  derecede alakalı sonuçlar arasında sıralama yapılamaz.
- **Türkçe gövdeleme için `default_language: "turkish"` kullanıldı.** Varsayılan (İngilizce)
  gövdeleme Türkçe içerikte "balı" gibi çekim eklerini kaldıramaz, bu yüzden "bal" araması
  "balı" geçen ürünleri bulamazdı.
- **Bilinen kısıt: text index tam kelime eşleşmesi yapar, önek araması desteklenmez.**
  Örneğin "bal" araması "balkabağı" içeren bir ürünü bulmaz, çünkü text index kelimeleri
  köklerine indirger ve tam kelime bazında eşleştirir; "bal" ile başlayan farklı bir kelimeyi
  aynı kök saymaz. Üretimde bu kısıt, önek/typo-tolerant arama sağlayan MongoDB Atlas Search
  `autocomplete` operatörü ile çözülecektir.
- **Katalog kimlik doğrulaması gerektirmez.** `/api/products` altındaki route'lara
  `authenticate` uygulanmaz; ürünleri görüntülemek bir müşteri hesabı gerektirmeyen, herkese
  açık bir işlemdir.
- **Satıcı bilgisi yalnızca ad olarak paylaşılır.** Liste ve detay response'larında
  `seller: { _id, name }` döner; `populate("sellerId", "name")` ile alan seçimi yapılmadan
  satıcının e-posta adresi ve diğer tüm `User` alanları response'a sızardı.

## Örnek Veri

Geliştirme ortamında hızlıca test edilebilir veri oluşturmak için bir seed script'i bulunur.
Production'da (`NODE_ENV=production`) çalıştırılamaz, script anında hata verip çıkar.

```bash
cd backend

# Mevcut kullanıcıları/ürünleri koruyarak seed'ler (idempotent — kullanıcı zaten
# varsa yeniden oluşturmaz, satıcının zaten ürünü varsa tekrar ürün eklemez)
npm run seed

# Önce seed kullanıcılarını ve onlara ait ürünleri temizleyip sıfırdan seed'ler
npm run seed:reset
```

3 seller ve 2 customer, sellerlara dağıtılmış ~20 gerçekçi yerel üretici ürünü (bal,
zeytinyağlı sabun, el dokuma kilim, kekik çayı vb.) oluşturur. Birkaç ürün stok testleri
için `stock: 0`, birkaçı da `isActive: false` olarak işaretlidir.

**Test hesapları** (hepsinde şifre `Test1234`):

| Rol      | E-posta                  |
| -------- | ------------------------- |
| seller   | seller1@localshop.dev     |
| seller   | seller2@localshop.dev     |
| seller   | seller3@localshop.dev     |
| customer | customer1@localshop.dev   |
| customer | customer2@localshop.dev   |

## Veritabanı Indexleri

Şema üzerindeki indeks tanımları değiştiğinde (yeni indeks, silinen indeks, değişen
seçenekler), bu değişiklik uygulama açılışında otomatik uygulanmaz — MongoDB, aynı isimde
ama farklı seçeneklere sahip bir indeks oluşturmaya çalışıldığında mevcut indeksi sessizce
güncellemek yerine hata verir. Böyle bir değişiklikten sonra indeksleri şemayla senkronize
etmek için:

```bash
cd backend
npm run sync-indexes
```

## API Dokümantasyonu

TODO — Faz 11'de doldurulacak

## Demo Video

TODO — Faz 11'de doldurulacak
