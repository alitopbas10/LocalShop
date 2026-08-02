// Tekrar çalıştırılabilir güvenlik denetim script'i. Çalışan bir sunucuya (npm run dev)
// gerçek HTTP istekleri atar; DB'ye doğrudan erişmez. Hem geliştirme sırasında regresyon
// yakalamak hem de demo videosunda güvenlik önlemlerini göstermek için tasarlandı.
//
// Önkoşullar:
//   - Sunucu çalışıyor olmalı (varsayılan http://localhost:5000, AUDIT_BASE_URL ile değiştirilebilir)
//   - Seed verisi yüklü olmalı (npm run seed): seller1/seller2, customer1/customer2 hesapları kullanılır
//   - Script, sunucuyla AYNI .env dosyasını (JWT_SECRET) okur; JWT enjeksiyon testleri bu yüzden
//     sunucu ile aynı ortamda (aynı repo, aynı .env) çalıştırılmalıdır.
import { randomBytes } from "node:crypto";

import jwt from "jsonwebtoken";

import { env } from "@/config/env";
import { SENSITIVE_FIELDS } from "@/shared/sensitiveFields";

// token.service.ts'teki ISSUER ile birebir aynı olmalı; JWT enjeksiyon testleri bu değeri kullanır.
const TOKEN_ISSUER = "localshop-api";

const BASE_URL = process.env.AUDIT_BASE_URL ?? "http://localhost:5000";

const SEED_PASSWORD = "Test1234";
const SEED_ACCOUNTS = {
  seller1: "seller1@localshop.dev",
  seller2: "seller2@localshop.dev",
  customer1: "customer1@localshop.dev",
  customer2: "customer2@localshop.dev",
} as const;

// ---- RENKLİ ÇIKTI ----

const color = {
  green: (s: string): string => `\x1b[32m${s}\x1b[0m`,
  red: (s: string): string => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string): string => `\x1b[33m${s}\x1b[0m`,
  cyan: (s: string): string => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string): string => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string): string => `\x1b[2m${s}\x1b[0m`,
};

// ---- HAM JSON ERİŞİM YARDIMCILARI ----
// `any` kullanılmaz (proje kuralı); response gövdesi `unknown` olarak tutulur, bu
// yardımcılar güvenli, tip daraltmalı erişim sağlar.

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function dig(value: unknown, ...keys: string[]): unknown {
  let current = value;
  for (const key of keys) {
    const rec = asRecord(current);
    if (!rec) {
      return undefined;
    }
    current = rec[key];
  }
  return current;
}

// Response gövdesini (nesne/dizi, iç içe) tarar; forbidden listesindeki bir anahtar
// bulunursa yolunu (ör. "seller.email") döner, bulunamazsa null.
function findForbiddenKey(value: unknown, forbidden: readonly string[], path = ""): string | null {
  const arr = asArray(value);
  if (arr) {
    for (let i = 0; i < arr.length; i += 1) {
      const found = findForbiddenKey(arr[i], forbidden, `${path}[${i}]`);
      if (found) {
        return found;
      }
    }
    return null;
  }

  const rec = asRecord(value);
  if (rec) {
    for (const [key, val] of Object.entries(rec)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (forbidden.includes(key)) {
        return currentPath;
      }
      const found = findForbiddenKey(val, forbidden, currentPath);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// ---- HTTP İSTEMCİSİ ----

interface HttpResult {
  status: number;
  body: unknown;
  headers: Headers;
}

interface RequestOptions {
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request(method: string, path: string, opts: RequestOptions = {}): Promise<HttpResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...opts.headers };
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { status: res.status, body, headers: res.headers };
}

// ---- JWT ENJEKSİYON YARDIMCILARI ----

function base64url(input: string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// alg:"none" ile manuel token üretimi: imza kısmı boştur. verifyAccessToken'daki
// `algorithms: ["HS256"]` kısıtlaması (algorithm pinning) çalışıyorsa bu token reddedilmeli.
function craftNoneAlgToken(sub: string): string {
  const header = base64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ sub, role: "customer", iss: TOKEN_ISSUER }));
  return `${header}.${payload}.`;
}

function craftExpiredToken(sub: string): string {
  return jwt.sign({ sub, role: "customer" }, env.JWT_SECRET, {
    algorithm: "HS256",
    issuer: TOKEN_ISSUER,
    expiresIn: "-1s",
  });
}

function craftWrongSecretToken(sub: string): string {
  return jwt.sign({ sub, role: "customer" }, "attacker-controlled-secret-does-not-match-server", {
    algorithm: "HS256",
    issuer: TOKEN_ISSUER,
    expiresIn: "1h",
  });
}

// ---- TEST DEFTERİ ----

interface TestCase {
  id: string;
  name: string;
  expected: string;
  actual: string;
  pass: boolean;
  note?: string;
}

const results: TestCase[] = [];

function record(id: string, name: string, expected: string, actual: string, pass: boolean, note?: string): void {
  const testCase: TestCase = { id, name, expected, actual, pass, note };
  results.push(testCase);

  const badge = pass ? color.green(" PASS ") : color.red(" FAIL ");
  console.log(`${color.bold(`[${id}]`)} ${name}`);
  console.log(`      beklenen    : ${expected}`);
  console.log(`      gerçekleşen : ${actual}${badge}`);
  if (note) {
    console.log(color.dim(`      not         : ${note}`));
  }
  console.log("");
}

type TestFn = () => Promise<{ pass: boolean; actual: string; note?: string }>;

async function test(id: string, name: string, expected: string, fn: TestFn): Promise<void> {
  try {
    const { pass, actual, note } = await fn();
    record(id, name, expected, actual, pass, note);
  } catch (error) {
    record(id, name, expected, "İSTİSNA", false, errMsg(error));
  }
}

function printGroupHeader(letter: string, title: string): void {
  console.log(color.cyan(color.bold(`\n=== ${letter}) ${title} ===\n`)));
}

// Bu proje validasyon hatalarında (Zod/AppError.validation) HTTP 422 (Unprocessable
// Entity) kullanır, 400 değil — bu, bu görevden önce kurulmuş bir proje kuralıdır
// (bkz. shared/AppError.ts, AppError.validation). Görev metninde "400" beklenen testler
// (11, 12, 20, 22) bu yüzden 400 VEYA 422'yi kabul eder: önemli olan isteğin asla 2xx ile
// işlenmemesidir.
function isRejected(status: number): boolean {
  return status === 400 || status === 422;
}

// ---- KURULUM (fixture'lar) ----

interface LoggedInUser {
  token: string;
  id: string;
}

async function login(email: string, password: string): Promise<LoggedInUser> {
  const res = await request("POST", "/api/auth/login", { body: { email, password } });
  const token = asString(dig(res.body, "data", "token"));
  const id = asString(dig(res.body, "data", "user", "_id"));
  if (res.status !== 200 || !token || !id) {
    throw new Error(
      `Setup login failed for ${email}: HTTP ${res.status} ${JSON.stringify(res.body)}. Seed verisi yüklü mü? (npm run seed)`,
    );
  }
  return { token, id };
}

interface SellerProduct {
  id: string;
  snapshot: Record<string, unknown>;
}

// Verilen satıcının aktif VE stoklu bir ürününü döner. Her çağrıda güncel stoğu
// yeniden sorgular; script tekrar tekrar çalıştırıldıkça stok azalsa da kendini uyarlar.
async function pickActiveProduct(sellerToken: string, sellerLabel: string): Promise<SellerProduct> {
  const res = await request("GET", "/api/seller/products?isActive=true&limit=100", { token: sellerToken });
  const items = asArray(dig(res.body, "data")) ?? [];
  for (const item of items) {
    const rec = asRecord(item);
    const stock = rec ? asNumber(rec.stock) : null;
    const id = rec ? asString(rec._id) : null;
    if (rec && id && stock !== null && stock > 0) {
      return { id, snapshot: rec };
    }
  }
  throw new Error(`${sellerLabel} için stokta aktif ürün bulunamadı. 'npm run seed:reset' deneyin.`);
}

interface CreatedOrder {
  orderId: string;
  totalPrice: number;
}

// customer'ın sepetine seller1'den bir ürün ekler ve sipariş oluşturur (PENDING_PAYMENT).
// Her çağrı BAĞIMSIZ bir sipariş üretir ki testler birbirinin sipariş durumunu bozmasın.
async function createOrderForCustomer(customerToken: string, sellerToken: string, sellerLabel: string): Promise<CreatedOrder> {
  const product = await pickActiveProduct(sellerToken, sellerLabel);

  const addRes = await request("POST", "/api/cart/items", {
    token: customerToken,
    body: { productId: product.id, quantity: 1 },
  });
  if (addRes.status !== 200) {
    throw new Error(`Sepete ekleme başarısız: HTTP ${addRes.status} ${JSON.stringify(addRes.body)}`);
  }

  const orderRes = await request("POST", "/api/orders", { token: customerToken, body: {} });
  const orderId = asString(dig(orderRes.body, "data", "_id"));
  const totalPrice = asNumber(dig(orderRes.body, "data", "totalPrice"));
  if (orderRes.status !== 201 || !orderId || totalPrice === null) {
    throw new Error(`Sipariş oluşturma başarısız: HTTP ${orderRes.status} ${JSON.stringify(orderRes.body)}`);
  }

  return { orderId, totalPrice };
}

function randomEmail(): string {
  return `audit-${Date.now()}-${randomBytes(4).toString("hex")}@localshop.dev`;
}

function randomObjectId(): string {
  return randomBytes(12).toString("hex");
}

function randomSpoofedIp(): string {
  const octet = (): number => Math.floor(Math.random() * 255) + 1;
  return `${octet()}.${octet()}.${octet()}.${octet()}`;
}

// ---- A) KİMLİK DOĞRULAMA ----

async function groupA(customer1Id: string): Promise<void> {
  printGroupHeader("A", "KİMLİK DOĞRULAMA");

  await test("A1", "Token'sız korumalı endpoint", "401", async () => {
    const res = await request("GET", "/api/auth/me");
    return { pass: res.status === 401, actual: String(res.status) };
  });

  await test("A2", "Bozuk token", "401", async () => {
    const res = await request("GET", "/api/auth/me", { token: "not-a-real-token" });
    return { pass: res.status === 401, actual: String(res.status) };
  });

  await test("A3", '"none" algoritmasıyla imzalanmış token (algorithm pinning)', "401", async () => {
    const res = await request("GET", "/api/auth/me", { token: craftNoneAlgToken(customer1Id) });
    return { pass: res.status === 401, actual: String(res.status) };
  });

  await test("A4", "Süresi geçmiş token", "401", async () => {
    const res = await request("GET", "/api/auth/me", { token: craftExpiredToken(customer1Id) });
    return { pass: res.status === 401, actual: String(res.status) };
  });

  await test("A5", "Başka bir secret ile imzalanmış token", "401", async () => {
    const res = await request("GET", "/api/auth/me", { token: craftWrongSecretToken(customer1Id) });
    return { pass: res.status === 401, actual: String(res.status) };
  });
}

// ---- B) YETKİLENDİRME ----

async function groupB(
  customer1: LoggedInUser,
  customer2: LoggedInUser,
  seller1: LoggedInUser,
  seller2: LoggedInUser,
  seller2Product: SellerProduct,
  orderAId: string,
): Promise<void> {
  printGroupHeader("B", "YETKİLENDİRME");

  await test("B6", "Customer, seller endpoint'ine erişmeye çalışıyor", "403", async () => {
    const res = await request("GET", "/api/seller/products", { token: customer1.token });
    return { pass: res.status === 403, actual: String(res.status) };
  });

  await test("B7", "Seller, customer endpoint'ine erişmeye çalışıyor", "403", async () => {
    const res = await request("GET", "/api/cart", { token: seller1.token });
    return { pass: res.status === 403, actual: String(res.status) };
  });

  await test("B8", "Seller A, Seller B'nin ürününü güncellemeye çalışıyor (IDOR)", "403", async () => {
    const res = await request("PATCH", `/api/seller/products/${seller2Product.id}`, {
      token: seller1.token,
      body: { name: "Hacked by security audit" },
    });

    // Savunma amaçlı: regresyon varsa (403 dönmediyse) ürün gerçekten değişmiş olabilir.
    // Test verisini bozmamak için sahibi (seller2) adına orijinal haline geri döndürülür.
    if (res.status !== 403) {
      const original = seller2Product.snapshot;
      await request("PATCH", `/api/seller/products/${seller2Product.id}`, {
        token: seller2.token,
        body: {
          name: original.name,
          description: original.description,
          price: original.price,
          stock: original.stock,
          category: original.category,
        },
      }).catch(() => undefined);
    }

    return { pass: res.status === 403, actual: String(res.status) };
  });

  await test("B9", "Customer A, Customer B'nin siparişini görüntülemeye çalışıyor", "403", async () => {
    const res = await request("GET", `/api/orders/${orderAId}`, { token: customer2.token });
    return { pass: res.status === 403, actual: String(res.status) };
  });
}

// ---- C) ENJEKSİYON ----

async function groupC(): Promise<void> {
  printGroupHeader("C", "ENJEKSİYON");

  await test("C10", "Login'de $ne operatör enjeksiyonu", "token DÖNMEMELİ (200 değil)", async () => {
    const res = await request("POST", "/api/auth/login", {
      body: { email: { $ne: null }, password: { $ne: null } },
    });
    const token = dig(res.body, "data", "token");
    const pass = res.status !== 200 && token === undefined;
    return { pass, actual: `HTTP ${res.status}, token=${token === undefined ? "yok" : "VAR!"}` };
  });

  await test("C11", "Query'de operatör enjeksiyonu (category[$ne]=food)", "400/422", async () => {
    const res = await request("GET", "/api/products?category[$ne]=food");
    return { pass: isRejected(res.status), actual: String(res.status) };
  });

  await test("C12", "Parametre kirliliği (page=1&page=2)", "400/422", async () => {
    const res = await request("GET", "/api/products?page=1&page=2&limit=5");
    return { pass: isRejected(res.status), actual: String(res.status) };
  });

  await test("C13", "__proto__ ile prototype pollution denemesi (register)", "rol değişmemeli (customer)", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: JSON.parse(
        `{"name":"Audit Proto","email":"${randomEmail()}","password":"Test1234","__proto__":{"role":"admin"}}`,
      ) as unknown,
    });
    const role = asString(dig(res.body, "data", "user", "role"));
    const pollutedGlobally = (Object.prototype as unknown as { role?: unknown }).role !== undefined;
    const pass = res.status === 201 && role === "customer" && !pollutedGlobally;
    return { pass, actual: `HTTP ${res.status}, role=${role ?? "?"}, Object.prototype kirlendi=${pollutedGlobally}` };
  });
}

// ---- D) VERİ SIZINTISI ----

async function groupD(
  customer1: LoggedInUser,
  seller1: LoggedInUser,
  orderAId: string,
): Promise<void> {
  printGroupHeader("D", "VERİ SIZINTISI");

  await test("D14", "Register response'unda password/__v yok", "yok (HTTP 201)", async () => {
    const res = await request("POST", "/api/auth/register", {
      body: { name: "Audit Leak Test", email: randomEmail(), password: "Test1234" },
    });
    const leaked = findForbiddenKey(dig(res.body, "data"), SENSITIVE_FIELDS);
    const pass = res.status === 201 && !leaked;
    const note =
      res.status !== 201
        ? "Beklenmeyen status — muhtemelen authRateLimit (register, login ile aynı sayaç) tükenmiş olabilir."
        : undefined;
    return { pass, actual: `HTTP ${res.status}, ${leaked ? `bulundu: ${leaked}` : "yok"}`, note };
  });

  await test("D15", "/api/auth/me response'unda password/__v yok", "yok (HTTP 200)", async () => {
    const res = await request("GET", "/api/auth/me", { token: customer1.token });
    const leaked = findForbiddenKey(dig(res.body, "data"), SENSITIVE_FIELDS);
    const pass = res.status === 200 && !leaked;
    return { pass, actual: `HTTP ${res.status}, ${leaked ? `bulundu: ${leaked}` : "yok"}` };
  });

  await test("D16", "Katalog response'unda satıcı e-postası yok", "yok (HTTP 200)", async () => {
    const res = await request("GET", "/api/products?limit=20");
    const leaked = findForbiddenKey(dig(res.body, "data"), ["email"]);
    const pass = res.status === 200 && !leaked;
    return { pass, actual: `HTTP ${res.status}, ${leaked ? `bulundu: ${leaked}` : "yok"}` };
  });

  await test("D17", "Satıcı sipariş response'unda alıcı e-postası yok", "yok (HTTP 200)", async () => {
    const res = await request("GET", `/api/seller/orders/${orderAId}`, { token: seller1.token });
    const leaked = findForbiddenKey(dig(res.body, "data"), ["email"]);
    const pass = res.status === 200 && !leaked;
    return { pass, actual: `HTTP ${res.status}, ${leaked ? `bulundu: ${leaked}` : "yok"}` };
  });

  await test("D18", "Payment response'unda cardNumber/cvv/expiry yok", "yok (HTTP 200)", async () => {
    const order = await createOrderForCustomer(customer1.token, seller1.token, "seller1");
    const res = await request("POST", "/api/payments/pay", {
      token: customer1.token,
      body: {
        orderId: order.orderId,
        cardNumber: "4000000000000000", // FakePay DECLINE test kartı
        cardHolder: "Audit Test",
        expiry: "12/30",
        cvv: "123",
      },
    });
    const leaked = findForbiddenKey(dig(res.body, "data"), ["cardNumber", "cvv", "expiry"]);
    const pass = res.status === 200 && !leaked;
    const note = res.status === 429 ? "paymentRateLimit tükenmiş olabilir (önceki bir F25 çalışmasından)." : undefined;
    return { pass, actual: `HTTP ${res.status}, ${leaked ? `bulundu: ${leaked}` : "yok"}`, note };
  });

  await test("D19", "500 hatasında stack trace yok (production simülasyonu)", "yok", async () => {
    // Yasak olmayan bir Origin ile CORS hatası tetikler → cors middleware next(err) çağırır →
    // errorHandler'ın catch-all dalına düşer (500). Yıkıcı olmayan, dışarıdan tetiklenebilir
    // tek 500 senaryosu budur.
    const res = await request("GET", "/health", { headers: { Origin: "https://not-a-real-site.example" } });
    const stack = dig(res.body, "error", "stack");
    const pass = res.status === 500 && stack === undefined;
    const note =
      stack !== undefined
        ? 'Stack bulundu — sunucu NODE_ENV=development ile çalışıyor olabilir (bu modda stack BİLİNÇLİ olarak eklenir). NODE_ENV=production ile tekrar deneyin.'
        : undefined;
    return { pass, actual: stack !== undefined ? "stack BULUNDU" : "stack yok", note };
  });
}

// ---- E) İŞ MANTIĞI ----

async function groupE(
  customer1: LoggedInUser,
  customer2: LoggedInUser,
  seller1: LoggedInUser,
  seller2: LoggedInUser,
): Promise<void> {
  printGroupHeader("E", "İŞ MANTIĞI");

  await test("E20", "İstemciden gelen amount ile ödeme", "400/422", async () => {
    const order = await createOrderForCustomer(customer1.token, seller1.token, "seller1");
    const res = await request("POST", "/api/payments/pay", {
      token: customer1.token,
      body: {
        orderId: order.orderId,
        cardNumber: "4242424242424242", // FakePay SUCCESS test kartı
        cardHolder: "Audit Test",
        expiry: "12/30",
        cvv: "123",
        amount: 1, // payCardSchema.strict() bu alanı tanımıyor, reddedilmeli
      },
    });

    // Reddedildiyse sipariş ödenmemiş kalmalı — bunu da doğrula.
    const orderCheck = await request("GET", `/api/orders/${order.orderId}`, { token: customer1.token });
    const status = asString(dig(orderCheck.body, "data", "status"));

    const pass = isRejected(res.status) && status !== "PAID";
    return { pass, actual: `HTTP ${res.status}, sipariş durumu=${status ?? "?"}` };
  });

  await test("E21", "İstemciden gelen sellerId ile ürün ekleme (yoksayılmalı)", "yoksayılmış (sellerId = kendi id'si)", async () => {
    const res = await request("POST", "/api/seller/products", {
      token: seller2.token,
      body: {
        name: "Audit Test Product (safe to delete)",
        description: "Bu ürün security audit script tarafından oluşturuldu, otomatik pasifleştirilir.",
        price: 9.99,
        stock: 5,
        category: "other",
        sellerId: seller1.id, // enjekte edilmeye çalışılan başkasının id'si
      },
    });
    const returnedSellerId = asString(dig(res.body, "data", "sellerId"));
    const productId = asString(dig(res.body, "data", "_id"));
    const pass = res.status === 201 && returnedSellerId === seller2.id;

    // Temizlik: test ürününü pasifleştir ki katalogda kalıcı kirlilik oluşmasın.
    if (productId) {
      await request("DELETE", `/api/seller/products/${productId}`, { token: seller2.token }).catch(() => undefined);
    }

    return { pass, actual: `sellerId=${returnedSellerId ?? "?"} (beklenen: ${seller2.id})` };
  });

  await test("E22", "İstemciden gelen items ile sipariş oluşturma", "400/422", async () => {
    const res = await request("POST", "/api/orders", {
      token: customer2.token,
      body: { items: [{ productId: randomObjectId(), price: 1, quantity: 1 }] },
    });
    return { pass: isRejected(res.status), actual: String(res.status) };
  });

  await test("E23", "Ödenmemiş (PENDING_PAYMENT) siparişi kargolama", "409", async () => {
    const order = await createOrderForCustomer(customer1.token, seller1.token, "seller1");
    const res = await request("PATCH", `/api/seller/orders/${order.orderId}/fulfillment`, {
      token: seller1.token,
      body: { status: "SHIPPED" },
    });
    return { pass: res.status === 409, actual: String(res.status) };
  });
}

// ---- G) HEADER'LAR ----

async function groupG(): Promise<void> {
  printGroupHeader("G", "HEADER'LAR");

  await test("G26", "X-Powered-By header'ı yok", "yok", async () => {
    const res = await request("GET", "/health");
    const value = res.headers.get("x-powered-by");
    return { pass: value === null, actual: value ?? "yok" };
  });

  await test("G27", "Content-Security-Policy header'ı var", "var", async () => {
    const res = await request("GET", "/health");
    const value = res.headers.get("content-security-policy");
    return { pass: value !== null, actual: value ? "var" : "yok" };
  });

  await test("G28", "X-Content-Type-Options: nosniff var", "nosniff", async () => {
    const res = await request("GET", "/health");
    const value = res.headers.get("x-content-type-options");
    return { pass: value === "nosniff", actual: value ?? "yok" };
  });

  await test("G29", "İzin verilmeyen origin'e CORS izni yok", "Access-Control-Allow-Origin yok", async () => {
    const res = await request("GET", "/health", { headers: { Origin: "https://not-allowed.example" } });
    const value = res.headers.get("access-control-allow-origin");
    return { pass: value === null, actual: value ?? "yok" };
  });

  // trust proxy yanlış yapılandırılmışsa (ör. sabit 1, veya doğrudan dinleyen bir
  // uygulamada true) Express req.ip'yi İSTEMCİNİN gönderdiği X-Forwarded-For'dan okur.
  // Bu durumda saldırgan her istekte farklı bir X-Forwarded-For göndererek IP tabanlı
  // rate limiting'i (auth dahil) tamamen atlatabilir. 429 hiç gelmiyorsa bu açık VAR demektir.
  const XFF_ATTEMPT_CAP = 25;
  await test(
    "G30",
    "X-Forwarded-For ile rate limit atlatma denemesi (auth limiti)",
    "429 (bir noktada) — koruma çalışıyor",
    async () => {
      for (let attempt = 1; attempt <= XFF_ATTEMPT_CAP; attempt += 1) {
        const res = await request("POST", "/api/auth/login", {
          body: { email: SEED_ACCOUNTS.customer1, password: "WrongPassword!" },
          headers: { "X-Forwarded-For": randomSpoofedIp() },
        });
        if (res.status === 429) {
          return {
            pass: true,
            actual: "429",
            note: `${attempt}. denemede tetiklendi — sahte X-Forwarded-For yok sayıldı (trust proxy doğru yapılandırılmış)`,
          };
        }
      }
      return {
        pass: false,
        actual: `${XFF_ATTEMPT_CAP} denemede de 401 alındı, 429 hiç gelmedi`,
        note:
          'KRİTİK: rate limiting X-Forwarded-For ile atlatılabiliyor olabilir. TRUST_PROXY ' +
          'ortam değişkenini ve app.ts\'teki app.set("trust proxy", ...) satırını kontrol edin.',
      };
    },
  );
}

// ---- F) RATE LIMITING (HER ZAMAN EN SON ÇALIŞIR) ----

async function groupF(customer1: LoggedInUser): Promise<void> {
  printGroupHeader("F", "RATE LIMITING");
  console.log(
    color.yellow(
      "UYARI: F grubu rate limit sayaçlarını kasıtlı olarak tüketir. Bu script'i art arda\n" +
        "çalıştırırsanız login/ödeme denemeleri pencere sıfırlanana kadar (varsayılan 15dk)\n" +
        "429 dönebilir — bu bir script hatası değildir.\n",
    ),
  );

  const LOGIN_ATTEMPT_CAP = 25;
  await test("F24", "Login'e ardışık başarısız denemeler", "429 (bir noktada)", async () => {
    for (let attempt = 1; attempt <= LOGIN_ATTEMPT_CAP; attempt += 1) {
      const res = await request("POST", "/api/auth/login", {
        body: { email: SEED_ACCOUNTS.customer2, password: "WrongPassword!" },
      });
      if (res.status === 429) {
        return { pass: true, actual: "429", note: `${attempt}. denemede tetiklendi` };
      }
    }
    return {
      pass: false,
      actual: `${LOGIN_ATTEMPT_CAP} denemede de 429 gelmedi`,
      note: "Sunucu NODE_ENV=test olabilir (bu modda authRateLimit atlanır) ya da limit bu script'in denediğinden yüksek.",
    };
  });

  const PAYMENT_ATTEMPT_CAP = 35;
  await test("F25", "Ödeme endpoint'ine ardışık istekler", "429 (bir noktada)", async () => {
    const dummyOrderId = randomObjectId();
    for (let attempt = 1; attempt <= PAYMENT_ATTEMPT_CAP; attempt += 1) {
      const res = await request("POST", "/api/payments/pay", {
        token: customer1.token,
        body: {
          orderId: dummyOrderId,
          cardNumber: "4242424242424242",
          cardHolder: "Audit Test",
          expiry: "12/30",
          cvv: "123",
        },
      });
      if (res.status === 429) {
        return { pass: true, actual: "429", note: `${attempt}. denemede tetiklendi` };
      }
    }
    return {
      pass: false,
      actual: `${PAYMENT_ATTEMPT_CAP} denemede de 429 gelmedi`,
      note: "Sunucu NODE_ENV=test olabilir ya da limit bu script'in denediğinden yüksek.",
    };
  });
}

// ---- ÖZET ----

function printSummary(): void {
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;

  console.log(color.bold(color.cyan("\n=== ÖZET ===\n")));
  for (const r of results) {
    const badge = r.pass ? color.green("PASS") : color.red("FAIL");
    console.log(`  [${r.id.padEnd(4)}] ${badge}  ${r.name}`);
  }

  console.log("");
  console.log(
    `Toplam: ${total}  Geçti: ${color.green(String(passed))}  Kaldı: ${
      failed > 0 ? color.red(String(failed)) : "0"
    }`,
  );
  console.log(
    failed === 0
      ? color.bold(color.green("TÜM TESTLER GEÇTİ"))
      : color.bold(color.red(`${failed} TEST BAŞARISIZ`)),
  );
}

// ---- ANA AKIŞ ----

async function main(): Promise<void> {
  console.log(color.bold(color.cyan(`LocalShop Güvenlik Denetimi — hedef: ${BASE_URL}\n`)));

  let seller1: LoggedInUser;
  let seller2: LoggedInUser;
  let customer1: LoggedInUser;
  let customer2: LoggedInUser;

  try {
    console.log(color.dim("Kurulum: seed hesaplarıyla giriş yapılıyor..."));
    seller1 = await login(SEED_ACCOUNTS.seller1, SEED_PASSWORD);
    seller2 = await login(SEED_ACCOUNTS.seller2, SEED_PASSWORD);
    customer1 = await login(SEED_ACCOUNTS.customer1, SEED_PASSWORD);
    customer2 = await login(SEED_ACCOUNTS.customer2, SEED_PASSWORD);
  } catch (error) {
    console.error(color.red(color.bold("\nKurulum başarısız, testler çalıştırılamıyor:")));
    console.error(color.red(errMsg(error)));

    if (errMsg(error).includes("429")) {
      console.error(
        color.yellow(
          "\nBu bir 429 (Too Many Requests) hatası: muhtemelen bu script'in ÖNCEKİ bir çalışmasında " +
            "F grubu (rate limiting testleri) login sayaçlarını tüketti. Seed verisiyle veya sunucuyla " +
            "ilgili bir sorun değildir — authRateLimit penceresi dolana kadar (varsayılan 15dk) bekleyin.",
        ),
      );
    } else {
      console.error(
        color.yellow(
          `\nKontrol listesi:\n  - Sunucu çalışıyor mu? (${BASE_URL})\n  - Seed verisi yüklü mü? (npm run seed)`,
        ),
      );
    }
    process.exitCode = 1;
    return;
  }

  // B8 ve E21 için seller2'nin bir ürünü gerekiyor (snapshot, olası regresyonu geri almak için).
  const seller2Product = await pickActiveProduct(seller2.token, "seller2");

  // B9 ve D17 için customer1'e ait, salt-okunur amaçlı paylaşılan TEK bir sipariş.
  // (Diğer testler kendi bağımsız siparişlerini oluşturur — mutasyon riski taşıyan
  // testlerin birbirini etkilememesi için.)
  const orderA = await createOrderForCustomer(customer1.token, seller1.token, "seller1");

  await groupA(customer1.id);
  await groupB(customer1, customer2, seller1, seller2, seller2Product, orderA.orderId);
  await groupC();
  await groupD(customer1, seller1, orderA.orderId);
  await groupE(customer1, customer2, seller1, seller2);
  await groupG();
  await groupF(customer1);

  printSummary();

  process.exitCode = results.some((r) => !r.pass) ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(color.red("Beklenmeyen hata:"), error);
  process.exitCode = 1;
});
