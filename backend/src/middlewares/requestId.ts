import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

// Kullanıcı "hata aldım" dediğinde log'da o isteği bulmanın tek pratik yolu bu id'dir.
// İç detay (stack, sorgu, dosya yolu) sızdırmadan hata ayıklanabilirlik sağlar: mesajı
// gizli tutup id'yi paylaşabiliriz.
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = randomUUID();
  req.id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
