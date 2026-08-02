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
