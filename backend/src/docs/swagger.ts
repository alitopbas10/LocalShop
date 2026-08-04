import { Router } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { isDev } from "@/config/env";
import { openApiDocument } from "@/docs/openapi";

// Varsayılan: development'ta açık. ENABLE_API_DOCS ile bu varsayılan production dahil
// her ortamda açıkça override edilebilir (ör. bir staging ortamında dokümanı göstermek
// için ENABLE_API_DOCS=true, ya da development'ta gizlemek için ENABLE_API_DOCS=false).
const enableDocs = process.env.ENABLE_API_DOCS === undefined ? isDev : process.env.ENABLE_API_DOCS === "true";

export const docsRoutes = Router();

if (enableDocs) {
  docsRoutes.get("/docs.json", (_req, res) => {
    res.json(openApiDocument);
  });

  docsRoutes.use(
    "/docs",
    // app.ts'teki global helmet, API için defaultSrc: 'none' uygular (bkz.
    // config/security.ts) — doğru bir politika ama Swagger UI aynı sunucudan servis
    // edilen bir HTML/JS sayfası; connect-src de 'none' olduğundan tarayıcı "Try it
    // out" fetch isteğini sunucuya hiç göndermeden engelliyordu ("Failed to fetch").
    // Bu middleware yalnızca /api/docs altında, global helmet'ten SONRA çalışıp aynı
    // header'ı (Content-Security-Policy) daha gevşek bir politikayla üzerine yazar.
    // Gevşetme SADECE bu dokümantasyon arayüzü içindir: Swagger UI satır içi script
    // ve stil kullandığı için 'unsafe-inline' gerekiyor. API route'ları (app.ts'teki
    // global helmet) sıkı politikayı korumaya devam eder; bu route zaten
    // production'da (ENABLE_API_DOCS kapalıyken) hiç mount edilmez.
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
      },
    }),
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      swaggerOptions: {
        // Sayfa yenilendiğinde "Authorize" ile girilen bearer token korunur; her
        // endpoint'i denerken tekrar tekrar token yapıştırmaya gerek kalmaz.
        persistAuthorization: true,
        docExpansion: "list",
      },
    }),
  );
}
