import type { CorsOptions } from "cors";
import type { HelmetOptions } from "helmet";

import { env, isProd } from "@/config/env";

// Origin header'ı olmayan istekler (curl, Postman, sunucu-sunucu çağrıları) tarayıcı
// kaynaklı değildir; CORS bir tarayıcı güvenlik mekanizmasıdır, bu isteklere izin
// vermemek ekstra güvenlik sağlamaz, sadece meşru kullanım senaryolarını kırar.
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || env.CORS_ORIGIN.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  // Idempotency-Key olmadan tarayıcı preflight isteğini reddeder.
  allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
  maxAge: 86400,
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
