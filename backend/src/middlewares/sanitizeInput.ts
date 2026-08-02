import type { NextFunction, Request, Response } from "express";

import { isDev } from "@/config/env";

// req.query için burada ayrı bir koruma YOK: tüm query parametreleri route
// seviyesinde Zod şemalarından geçiyor (bkz. middlewares/validate.ts).
// z.string() bir nesne kabul etmez, z.coerce.number() bir dizi kabul etmez —
// bu yüzden ?email[$ne]=x veya ?page=1&page=2 gibi denemeler zaten validate
// middleware'inde 400 ile reddedilir. Asıl savunma katmanı şema doğrulamasıdır,
// bu middleware sadece ek bir kat. Ayrıca Express 5'te req.query salt-okunur
// bir getter'dır; üzerine yazmaya çalışmak ya çöker ya sessizce hiçbir şey
// yapmaz (Faz 1'de bu kısıtla karşılaşıldı) — bu yüzden burada dokunulmuyor.
//
// req.body ve req.params Express 5'te hâlâ normal, yazılabilir alanlardır.

const MAX_DEPTH = 10;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// "$" ile başlayan anahtarlar MongoDB operatörüdür ($ne, $gt, $where, ...),
// nokta içeren anahtarlar iç içe alanı hedefler (ör. "profile.isAdmin") —
// ikisi de sorgu/güncelleme filtresine karışırsa operatör enjeksiyonuna yol
// açar. __proto__/constructor/prototype ise prototype pollution hedefidir.
function isDangerousKey(key: string): boolean {
  return (
    key.startsWith("$") ||
    key.includes(".") ||
    key === "__proto__" ||
    key === "constructor" ||
    key === "prototype"
  );
}

function sanitize(value: unknown, depth: number): unknown {
  // Aşırı iç içe payload'larla CPU tüketimini önlemek için derinlik sınırı:
  // limitin ötesindeki yapı olduğu gibi bırakılır, daha fazla özyineleme yapılmaz.
  if (depth > MAX_DEPTH) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, depth + 1));
  }

  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (isDangerousKey(key)) {
        // Sadece anahtar loglanır, değer ASLA — değer hassas veri taşıyor olabilir.
        if (isDev) {
          console.warn(`sanitizeInput: removed dangerous key "${key}"`);
        }
        continue;
      }
      result[key] = sanitize(val, depth + 1);
    }
    return result;
  }

  return value;
}

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body !== undefined) {
    req.body = sanitize(req.body, 0);
  }
  req.params = sanitize(req.params, 0) as typeof req.params;
  next();
}
