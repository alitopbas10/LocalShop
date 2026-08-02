// axios zaten undefined değerli query parametrelerini kendi serileştiricisinde atlar,
// ama bunu burada açıkça yapmak niyeti belli eder ve axios'un iç davranışına bağımlı
// kalmaz: boş bir filtre alanı (ör. seçilmemiş kategori) backend'deki Zod şemasına
// undefined yerine "undefined" string'i ya da başka bir sürpriz değer olarak gitmez.
export function cleanParams<T extends object>(params: T): Partial<T> {
  const cleaned: Partial<T> = {};
  for (const key of Object.keys(params) as (keyof T)[]) {
    const value = params[key];
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}
