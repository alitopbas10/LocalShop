import mongoose from "mongoose";

import { env } from "@/config/env";

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  // mongoose.set("sanitizeFilter", true) BİLİNÇLİ OLARAK KULLANILMIYOR: Mongoose'un
  // implementasyonu (lib/helpers/query/sanitizeFilter.js) yalnızca zaten "$eq" olan
  // tek-anahtarlı nesneleri güvenli sayar; "$in", "$gte", "$lte", "$elemMatch" gibi
  // uygulamanın KENDİSİNİN kurduğu tamamen meşru operatörleri de tekrar { $eq: ... }
  // içine sarar ve sorguyu bozar (ör. Product.find({ _id: { $in: ids } } ) çalışmaz
  // hale gelir — sepet, checkout, stok düşümü, kategori/fiyat filtreleri etkilenir).
  // Operatör enjeksiyonuna karşı asıl savunma zaten sanitizeInput middleware'i
  // ("$" ile başlayan/nokta içeren anahtarları request seviyesinde siler) ve Zod
  // şemalarıdır (bir alan z.string()/z.enum() ise bir nesne asla değer olarak kabul
  // edilmez); bu ikisi filtre oluşturulmadan ÖNCE çalışır, sanitizeFilter'ın
  // sağladığı ek katmana ihtiyaç bırakmaz.
  await mongoose.connect(env.MONGO_URI);
  console.log("MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}
