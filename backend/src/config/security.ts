import type { CorsOptionsDelegate } from "cors";
import type { Request } from "express";
import type { HelmetOptions } from "helmet";

import { env, isProd } from "@/config/env";

// Origin header'ı olmayan istekler (curl, Postman, sunucu-sunucu çağrıları) tarayıcı
// kaynaklı değildir; CORS bir tarayıcı güvenlik mekanizmasıdır, bu isteklere izin
// vermemek ekstra güvenlik sağlamaz, sadece meşru kullanım senaryolarını kırar.
//
// req'e erişimi olan bir delegate kullanılır (basit bir origin fonksiyonu YETMEZ):
// /api/docs sayfası API'nin KENDİSİ tarafından servis edilir (bkz. src/docs/swagger.ts)
// ve Swagger UI "Try it out" istekleri bu sayfanın origin'inden gönderilir. Tarayıcılar
// POST gibi state-changing isteklerde Origin header'ını aynı-origin olsa bile ekler; bu
// origin env.CORS_ORIGIN'deki (yalnızca frontend origin'i) beyaz listeyle eşleşmediği
// için istek reddediliyordu. Sunucunun KENDİ adresini (req.protocol + Host header'ı
// üzerinden) ayrıca izin vermek yeni bir güvenlik açığı DOĞURMAZ: izin verilen origin
// zaten sunucunun ta kendisidir — CORS'un engellemeye çalıştığı üçüncü taraf sınırını
// genişletmez, tarayıcı bu origin'i zaten yalnızca gerçekten o adresten yüklenen bir
// sayfa (ör. Swagger UI) için gönderir.
export const corsOptions: CorsOptionsDelegate<Request> = (req, callback) => {
  const origin = req.headers.origin;
  const selfOrigin = `${req.protocol}://${req.get("host")}`;
  const allowed = !origin || env.CORS_ORIGIN.includes(origin) || origin === selfOrigin;

  callback(allowed ? null : new Error("Not allowed by CORS"), {
    origin: allowed,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    // Idempotency-Key olmadan tarayıcı preflight isteğini reddeder.
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    maxAge: 86400,
  });
};

// Bu bir JSON API, HTML/CSS/JS servis etmiyor — CSP mümkün olan en sıkı şekilde
// kapatılabilir, hiçbir meşru kaynağı kısıtlamaz.
export const helmetOptions: HelmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  // Frontend farklı porttan çağıracak.
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: isProd ? { maxAge: 60 * 60 * 24 * 365 } : false,
  referrerPolicy: { policy: "no-referrer" },
};
