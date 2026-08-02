# CLAUDE.md

Bu dosya, bu repoda çalışan Claude Code oturumları için proje hafızasıdır.

## Proje
LocalShop — yerel üreticilerin ürünlerini doğrudan müşterilere sattığı marketplace MVP'si.
İki rol var: customer ve seller. Akış: seller kayıt olur → ürün ekler → customer ürünleri
görüntüler → sepete ekler → sipariş oluşturur → FakePay ile öder → seller siparişi yönetir.

## Teknoloji Stack
- Backend: Node.js, Express, TypeScript (strict), Mongoose, Zod, JWT, bcrypt
- Frontend: React 18, TypeScript, Vite, React Router, styled-components, Axios
- DB: MongoDB Atlas (M0 free tier — yönetilen replica set, transaction desteği hazır gelir)

## Backend Mimari Kuralları
- Feature-folder yapısı: src/modules/<feature>/ altında routes, controller, service, model, schema
- Katman sorumlulukları: controller sadece HTTP (req/res parse + status code), iş kuralları
  service'te, veri erişimi model'de. Controller içinde asla Mongoose sorgusu yazılmaz.
- Tüm async controller'lar asyncHandler wrapper ile sarılır, try/catch tekrarlanmaz
- Hatalar AppError sınıfı ile fırlatılır, merkezi error middleware yakalar
- Tüm response'lar tek zarf formatında:
  başarı → { success: true, data: ... }
  hata   → { success: false, error: { message, code, details? } }
- Tüm request body/query/params Zod ile valide edilir (validate middleware üzerinden)
- Import'larda @/ path alias kullanılır (örn. @/config/env)

## Frontend Mimari Kuralları
- src/ altında: components/ (paylaşılan), features/ (sayfa bazlı), services/ (API katmanı),
  hooks/, context/, styles/, types/, utils/
- API çağrıları asla component içinde fetch/axios ile yapılmaz; services/ katmanından geçer
- styled-components kullanılır, renk/spacing/font değerleri theme üzerinden okunur, hardcode edilmez
- Her async ekranda loading ve error state'i açıkça yönetilir

## Güvenlik Kuralları
- Şifreler bcrypt ile hash'lenir, User modelinde password alanı select:false
- Hassas alanlar (password, __v) hiçbir API response'unda yer almaz — toJSON transform ile temizlenir
- Kart bilgileri hiçbir koşulda DB'ye yazılmaz veya loglanmaz
- Tüm sırlar .env üzerinden okunur, koda gömülmez
- Seller kaynaklarında rol kontrolü yetmez, ownership kontrolü (sellerId === req.user.id) zorunludur

## Auth Kuralları
- Korumalı route'lar: authenticate middleware'i route seviyesinde uygulanır (her route
  kendi ihtiyacına göre ekler, global olarak uygulanmaz)
- Rol kısıtı gereken route'larda sıra sabittir: authenticate SONRA authorize("seller").
  authenticate önce req.user'ı doldurur, authorize rol kontrolünü onun üzerinden yapar
- authorize() sadece ROL kontrolü yapar, sahiplik kontrolü YAPMAZ; kaynak sahipliği ilgili
  service katmanında (sellerId === req.user.id) ayrıca kontrol edilmelidir — bu ayrımı
  atlamak klasik IDOR açığıdır
- Şifre asla loglanmaz, hiçbir response'a konmaz; User modelinde select: false ile korunur
- Login hataları her zaman jenerik: "Invalid email or password" (kullanıcı bulunamadı ile
  şifre yanlış durumları dışarıdan ayırt edilemez, aynı mesaj ve aynı hata kodu döner)
- JWT payload: { sub, role }. Kullanıcı bilgisi req.user'a her istekte DB'den tazelenerek
  doldurulur; token'daki role bilgisine körlemesine güvenilmez

## Kaynak Sahipliği
- Bir kullanıcıya ait kaynaklarda (product, cart, order) rol kontrolü YETMEZ; sahiplik
  kontrolü ayrı ve zorunlu bir katmandır
- Sahiplik kontrolü service katmanında yapılır, controller'da değil
- Standart akış: kaynağı id ile getir → yoksa 404 → sahibi değilse 403 (bu iki kontrol
  ayrı ayrı yapılır: 404 "böyle bir kaynak yok", 403 "var ama senin değil")
- Sahip alanı (sellerId, userId) ASLA request body'sinden okunmaz, her zaman
  req.user.id'den alınır — aksi halde bir kullanıcı başkası adına kaynak oluşturabilir
- Soft delete kullanılır: isActive: false. Kaynak fiziksel olarak silinmez; gerçek silme
  o kaynağa referans veren diğer kayıtları (sepet, sipariş geçmişi) kırar

## Katalog Kuralları
- Public katalog sorgularında { isActive: true } filtresi ZORUNLU — bu satır atlanırsa
  satıcının pasifleştirdiği (soft-delete edilmiş) ürünler müşteriye görünür hale gelir
- populate kullanırken alan seçimi ZORUNLU — seçim yapılmazsa hassas alanlar (ör. satıcının
  e-postası) response'a sızar
- Route sıralaması: sabit yollar (/categories) parametreli yollardan (/:id) ÖNCE tanımlanır;
  aksi halde Express sabit yolu :id parametresiyle eşleştirir
- Liste response'ları mapper'dan geçirilir, ham Mongoose belgesi dönülmez — response şekli
  Mongoose şemasından bağımsızlaşır, frontend tek bir tiple çalışabilir
- Pagination'da ikincil sıralama olarak _id kullanılır (kararlı sayfalama) — birincil alan
  (price, createdAt) eşit olan kayıtlarda sayfalar arası kayıt tekrarı/atlaması önlenir

## Sepet Kuralları
- Sepette ürün fiyatı SAKLANMAZ; her okumada üründen canlı çekilir. Fiyat snapshot'ı
  yalnızca sipariş oluşturulurken alınır (Faz 6) — sepet ve sipariş bilinçli olarak
  farklı davranır: sepet her zaman güncel fiyatı gösterir, sipariş o anki fiyatı dondurur
- Sepet okunurken her satır için uygunluk kontrolü yapılır: ürün pasifleştirilmiş mi
  (issue: PRODUCT_UNAVAILABLE), stok talep edilen adedi karşılıyor mu
  (issue: INSUFFICIENT_STOCK)
- subtotal SADECE uygun (available: true) satırlardan hesaplanır; sorunlu satırlar
  toplama dahil edilmez — müşterinin gördüğü tutar gerçekten satın alabileceği kadardır
- Sepete ekleme sırasındaki stok kontrolü bir REZERVASYON DEĞİLDİR; başka bir müşteri aynı
  anda aynı stoğu tüketebilir. Gerçek garanti sipariş anında transaction ile sağlanır (Faz 6)
- Sepet erişimi customer rolüne kısıtlıdır (authenticate + authorize("customer"))
- Para hesapları kuruş cinsine çevrilerek yapılır (Math.round(x * 100), toplama, /100) —
  floating point toplama hatası (0.1 + 0.2 problemi) sepet toplamına yansımasın diye

## Sipariş Kuralları
- Sipariş içeriği İSTEMCİDEN ALINMAZ, sunucudaki sepetten okunur — istemci ürün listesi
  veya fiyat gönderebilseydi, istediği fiyata sipariş oluşturabilirdi
- Sipariş satırlarındaki name ve price alanları SNAPSHOT'tır, ürün sonradan değişse veya
  silinse bile ASLA güncellenmez — sepet canlı fiyat gösterir, sipariş o anki fiyatı dondurur
- Stok düşümü şart bağlı atomik güncelleme ile yapılır:
  `updateOne({ _id, stock: { $gte: qty } }, { $inc: { stock: -qty } })`
  "Önce oku, karşılaştır, sonra yaz" deseni KULLANILMAZ — iki eşzamanlı istek aynı stoğu
  okuyup ikisi de yeterli görebilir, ikisi de düşer, sonuç negatif stok olur
- Stok düşümü, sipariş oluşturma ve sepet temizleme TEK transaction içindedir — biri
  başarısız olursa hepsi geri alınır
- withTransaction callback'i geçici hatalarda YENİDEN ÇALIŞTIRILABİLİR; bu yüzden içine
  idempotent olmayan yan etki (log, e-posta, dış servis çağrısı) KONMAZ
- Durum geçişleri ORDER_STATUS_TRANSITIONS / FULFILLMENT_TRANSITIONS haritalarından
  kontrol edilir, if/else zinciriyle değil — yeni bir durum eklenirken tek yere bakmak yeterli olur
- Satıcı sorgularında diğer satıcıların satırları FİLTRELENİR — bir satıcı başka bir
  satıcının aynı siparişte ne sattığını göremez
- Satıcıya alıcının yalnızca adı gösterilir, e-posta veya başka kişisel alan dönülmez

## Ödeme Kuralları
- Ödeme tutarı İSTEMCİDEN ALINMAZ, siparişten (order.totalPrice) okunur — payCardSchema
  bir amount alanı kabul etmez, .strict() ile bu alanı gönderen istek reddedilir
- Kart numarası, CVV, son kullanma tarihi HİÇBİR YERE yazılmaz: veritabanı, log, konsol,
  hata mesajı — hiçbiri. Payment şemasında bu alanlar için hiç yer yoktur, dolayısıyla
  "yanlışlıkla loglama" ihtimali de yapısal olarak kapatılmıştır
- Yalnızca cardLast4 ve cardBrand saklanır — makbuz gösterimi ve marka ikonu için
  yeterlidir, bu MVP'de tekrar tahsilat/iade gibi tam kart bilgisine ihtiyaç duyan bir
  akış yoktur
- Ödeme sağlayıcı (FakePay) çağrısı transaction DIŞINDA yapılır: transaction boyunca
  tutulan kilit dış servis yavaşsa veya takılırsa veritabanı kaynaklarını tüketir; ayrıca
  withTransaction callback'i geçici hatalarda yeniden çalıştırılabilir — dış çağrı
  transaction içinde olsaydı kart iki kez çekilebilirdi
- Sipariş durum geçişi (PENDING_PAYMENT/PAYMENT_FAILED → PAID) şartlı atomik güncelleme
  ile yapılır: `updateOne({ _id, status: { $in: [...] } }, { $set: { status: "PAID" } })`.
  modifiedCount 0 ise başka bir istek aynı anda ödemeyi tamamlamış demektir, transaction
  geri alınır
- Çifte ödeme, kısmi unique index ile veritabanı seviyesinde engellenir:
  `{ orderId: 1 }` üzerinde `unique` + `partialFilterExpression: { status: "SUCCEEDED" }`.
  Bir siparişin en fazla bir başarılı ödemesi olabilir; bunu yalnızca uygulama katmanında
  kontrol etmek yetmez, iki eşzamanlı istek ikisi de "henüz ödenmemiş" görebilir
- Format doğrulaması Zod şemasında yapılır (kart no 13-19 hane, MM/YY, CVV 3-4 hane);
  kabul/red kararı (Luhn kontrolü, test kartları) sağlayıcı katmanında (fakePay.provider)
  verilir — format doğrulaması ile kabul kararı farklı sorumluluklardır, karıştırılmaz
- Ödeme endpoint'ine sıkı rate limit uygulanır (15 dakikada 20 istek, başarılı denemeler
  dahil): bu endpoint card testing saldırılarının hedefidir — saldırgan çalıntı kart
  numaralarından hangisinin geçerli olduğunu art arda deneyerek bulmaya çalışır

## Kod Stili
- TypeScript strict mod, any kullanımı yasak, unknown + type guard tercih edilir
- Named export tercih edilir (React component'leri hariç)
- Yorumlar sadece "neden" açıklar, "ne" açıklamaz
- Türkçe karakter kullanılan yerler: sadece kullanıcıya görünen metinler. Kod, değişken,
  commit mesajı ve teknik yorumlar İngilizce.

## Commit Konvansiyonu
Conventional Commits: feat, fix, chore, docs, refactor, test, style
Scope kullanılır: feat(backend): ..., feat(frontend): ..., chore(infra): ...

## Çalışma Şekli
- Bu proje adım adım, faz faz geliştiriliyor. İstenmeyen dosya üretme, istenmeyen paket kurma.
- Bir adımda sadece o adımda istenen dosyalara dokun.
- .env dosyasını asla oluşturma veya değiştirme; sadece .env.example güncellenebilir.
