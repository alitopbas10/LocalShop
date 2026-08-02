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

## API Dokümantasyonu

TODO — Faz 11'de doldurulacak

## Demo Video

TODO — Faz 11'de doldurulacak
