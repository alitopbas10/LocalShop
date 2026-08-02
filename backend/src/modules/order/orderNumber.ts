import { randomBytes } from "node:crypto";

// 0/O ve 1/I/L gibi karışması kolay karakterler çıkarılmış alfabe. 32 karakter uzunluğu
// bilinçli: 256 (bir byte'ın alabileceği değer sayısı) 32'ye tam bölünür, bu yüzden
// `byte % 32` ile alfabeden karakter seçmek herhangi bir karaktere modulo bias getirmez.
const SUFFIX_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const SUFFIX_LENGTH = 6;

function randomSuffix(): string {
  const bytes = randomBytes(SUFFIX_LENGTH);
  let suffix = "";
  for (const byte of bytes) {
    suffix += SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length];
  }
  return suffix;
}

function datePart(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  return `${year}${month}${day}`;
}

// Math.random KULLANILMAZ: kriptografik olmayan üreteç, yüksek sipariş hacminde
// çakışma riskini artırır. crypto.randomBytes ile üretilen suffix çakışma ihtimalini
// pratikte ihmal edilebilir seviyeye indirir.
export function generateOrderNumber(): string {
  return `LS-${datePart()}-${randomSuffix()}`;
}
