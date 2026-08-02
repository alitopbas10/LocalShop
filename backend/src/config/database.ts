import mongoose from "mongoose";

import { env } from "@/config/env";

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);
  // Sorgu filtresine bir istekten (ör. req.body) doğrudan geçen nesne değerlerini
  // ($ne, $gt gibi operatörler dahil) otomatik olarak { $eq: <değer> } ile sarmalar.
  // sanitizeInput middleware'i zaten "$" ile başlayan/nokta içeren anahtarları
  // request seviyesinde temizliyor; bu ayar Mongoose seviyesinde ikinci bir kat
  // sağlar — middleware atlanan bir yol olsa bile (ör. ileride eklenecek bir
  // route) operatör enjeksiyonu sorgu katmanında da engellenmiş olur.
  mongoose.set("sanitizeFilter", true);
  await mongoose.connect(env.MONGO_URI);
  console.log("MongoDB connected");
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  console.log("MongoDB disconnected");
}
