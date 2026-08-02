import type { Types } from "mongoose";

import { connectDatabase, disconnectDatabase } from "@/config/database";
import { env } from "@/config/env";
import { User, type UserDocument } from "@/modules/auth/user.model";
import type { UserRole } from "@/modules/auth/user.types";
import { Product } from "@/modules/product/product.model";
import type { ProductCategory } from "@/modules/product/product.types";

// Bu koruma şart: seed script'i yanlışlıkla production'a bağlanırsa gerçek kullanıcı/ürün
// verisini seed kayıtlarıyla karıştırır ve --reset ile production verisini silme riski doğar.
if (env.NODE_ENV === "production") {
  console.error("Seed script production ortamında çalıştırılamaz (NODE_ENV=production).");
  process.exit(1);
}

const SEED_PASSWORD = "Test1234";

interface SeedUserInput {
  name: string;
  email: string;
  role: UserRole;
}

const SEED_USERS: SeedUserInput[] = [
  { name: "Ahmet Yılmaz", email: "seller1@localshop.dev", role: "seller" },
  { name: "Fatma Kaya", email: "seller2@localshop.dev", role: "seller" },
  { name: "Mehmet Demir", email: "seller3@localshop.dev", role: "seller" },
  { name: "Ayşe Şahin", email: "customer1@localshop.dev", role: "customer" },
  { name: "Can Öztürk", email: "customer2@localshop.dev", role: "customer" },
];

interface ProductTemplate {
  name: string;
  description: string;
  category: ProductCategory;
  price: number;
  stock: number;
  isActive: boolean;
}

// Fiyatlar 25-1500 TL arasında, stoklar 0-100 arasında; birkaçı bilinçli olarak 0 stok
// (Faz 6'daki stok kontrolü testleri için) ve birkaçı isActive:false olarak işaretlendi.
const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    name: "Kuru Kayısı (500g)",
    description: "Malatya bahçelerinden elle toplanmış, kükürtsüz doğal kuru kayısı.",
    category: "food",
    price: 85,
    stock: 45,
    isActive: true,
  },
  {
    name: "Ev Yapımı Domates Salçası (500g)",
    description: "Ege bölgesi domateslerinden katkısız, geleneksel yöntemle üretilmiş salça.",
    category: "food",
    price: 60,
    stock: 12,
    isActive: true,
  },
  {
    name: "Üzüm Pekmezi (650g)",
    description: "Şeker ilavesiz, doğal yöntemle kaynatılarak koyulaştırılmış üzüm pekmezi.",
    category: "food",
    price: 120,
    stock: 78,
    isActive: false,
  },
  {
    name: "Antep Fıstığı İçi (250g)",
    description: "Gaziantep bahçelerinden birinci kalite, kavrulmamış doğal iç fıstık.",
    category: "food",
    price: 450,
    stock: 0,
    isActive: true,
  },
  {
    name: "Kekik Çayı (100g)",
    description: "Ege dağlarından toplanıp güneşte kurutulmuş doğal kekik çayı.",
    category: "beverage",
    price: 45,
    stock: 33,
    isActive: true,
  },
  {
    name: "Adaçayı (100g)",
    description: "Taşpınar yaylalarından elle toplanan, kurutulmuş doğal adaçayı.",
    category: "beverage",
    price: 40,
    stock: 60,
    isActive: true,
  },
  {
    name: "Soğuk Sıkım Nar Ekşisi (500ml)",
    description: "Katkısız, geleneksel yöntemle üretilen doğal nar ekşisi.",
    category: "beverage",
    price: 95,
    stock: 90,
    isActive: true,
  },
  {
    name: "El Yapımı Bakır Tepsi",
    description: "Usta ellerde dövülerek şekillendirilmiş dekoratif bakır tepsi.",
    category: "handcraft",
    price: 650,
    stock: 5,
    isActive: true,
  },
  {
    name: "Söğüt Dalından Örgü Sepet",
    description: "Karadeniz yöresine özgü söğüt dalından geleneksel yöntemle örülmüş el işi sepet.",
    category: "handcraft",
    price: 220,
    stock: 0,
    isActive: true,
  },
  {
    name: "Şimşir Ahşap Kaşık Seti (3 Parça)",
    description: "Şimşir ağacından elde oyularak şekillendirilmiş mutfak kaşığı seti.",
    category: "handcraft",
    price: 180,
    stock: 24,
    isActive: false,
  },
  {
    name: "El Dokuma Yün Kilim (1x1.5m)",
    description: "Anadolu motifleriyle geleneksel tezgahta dokunmuş yüzde yüz yün kilim.",
    category: "textile",
    price: 1450,
    stock: 55,
    isActive: true,
  },
  {
    name: "Nakışlı Yastık Kılıfı",
    description: "Elde işlenmiş geleneksel motifli pamuklu yastık kılıfı.",
    category: "textile",
    price: 190,
    stock: 100,
    isActive: true,
  },
  {
    name: "Yöresel Dokuma Peştemal",
    description: "Doğal pamuk ipliğiyle dokunmuş, hamam ve plaj kullanımına uygun peştemal.",
    category: "textile",
    price: 260,
    stock: 8,
    isActive: true,
  },
  {
    name: "El Yapımı Zeytinyağlı Sabun",
    description: "Soğuk sıkım zeytinyağı ile geleneksel yöntemle üretilmiş doğal el sabunu.",
    category: "cosmetics",
    price: 55,
    stock: 0,
    isActive: true,
  },
  {
    name: "Isparta Lavanta Yağı (30ml)",
    description: "Isparta lavanta tarlalarından soğuk distilasyonla elde edilmiş saf lavanta yağı.",
    category: "cosmetics",
    price: 140,
    stock: 40,
    isActive: true,
  },
  {
    name: "Doğal Gül Suyu (200ml)",
    description: "Isparta gülünden buhar distilasyonuyla elde edilmiş katkısız doğal gül suyu.",
    category: "cosmetics",
    price: 75,
    stock: 65,
    isActive: true,
  },
  {
    name: "El Yapımı Çini Tabak",
    description: "Kütahya çini ustalarınca elde boyanmış, duvara asılabilir dekoratif tabak.",
    category: "home",
    price: 380,
    stock: 15,
    isActive: false,
  },
  {
    name: "Geleneksel Toprak Testi (Küçük Boy)",
    description: "Geleneksel çömlekçilik teknikleriyle elde şekillendirilmiş toprak testi.",
    category: "home",
    price: 210,
    stock: 70,
    isActive: true,
  },
  {
    name: "Cam Nazar Boncuğu Duvar Süsü",
    description: "Elde dizilmiş cam nazar boncuklarından oluşan geleneksel duvar süsü.",
    category: "home",
    price: 95,
    stock: 3,
    isActive: true,
  },
  {
    name: "Doğal Bal Mumu Mum Seti (4'lü)",
    description: "Katkısız bal mumundan elle dökülmüş, doğal kokulu 4 parça mum seti.",
    category: "other",
    price: 130,
    stock: 50,
    isActive: true,
  },
  {
    name: "El Yapımı Yün Keçe Terlik",
    description: "Doğal yün keçeden elde şekillendirilmiş, sıcak tutan geleneksel ev terliği.",
    category: "other",
    price: 165,
    stock: 20,
    isActive: true,
  },
  {
    name: "Doğal Lif Bulaşık Süngeri (Loofah)",
    description: "Loofah bitkisinden üretilmiş, plastik içermeyen doğal bulaşık süngeri.",
    category: "other",
    price: 35,
    stock: 85,
    isActive: true,
  },
];

async function resetSeedData(): Promise<void> {
  const emails = SEED_USERS.map((u) => u.email);
  const seedUsers = await User.find({ email: { $in: emails } }).select("_id");
  const seedUserIds = seedUsers.map((u) => u._id);

  const [{ deletedCount: deletedProducts }, { deletedCount: deletedUsers }] = await Promise.all([
    Product.deleteMany({ sellerId: { $in: seedUserIds } }),
    User.deleteMany({ email: { $in: emails } }),
  ]);

  console.log(`Reset: ${deletedUsers} seed kullanıcısı ve ${deletedProducts} seed ürünü silindi.`);
}

async function upsertUser(input: SeedUserInput): Promise<UserDocument> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    return existing;
  }

  return User.create({ name: input.name, email: input.email, password: SEED_PASSWORD, role: input.role });
}

// Sadece bu satıcı için henüz hiç ürün yoksa oluşturur: --reset kullanılmadan script tekrar
// çalıştırıldığında ürünlerin katlanarak çoğalmasını engeller.
async function seedProductsForSeller(
  sellerId: Types.ObjectId,
  templates: ProductTemplate[],
): Promise<number> {
  const existingCount = await Product.countDocuments({ sellerId });
  if (existingCount > 0) {
    return 0;
  }

  await Product.insertMany(templates.map((template) => ({ ...template, sellerId })));
  return templates.length;
}

async function main(): Promise<void> {
  const shouldReset = process.argv.includes("--reset");

  await connectDatabase();

  if (shouldReset) {
    await resetSeedData();
  }

  const users: UserDocument[] = [];
  for (const seedUser of SEED_USERS) {
    users.push(await upsertUser(seedUser));
  }

  const sellers = users.filter((u) => u.role === "seller");

  const templateBuckets: ProductTemplate[][] = sellers.map(() => []);
  PRODUCT_TEMPLATES.forEach((template, index) => {
    templateBuckets[index % sellers.length]?.push(template);
  });

  let createdProductCount = 0;
  for (let i = 0; i < sellers.length; i += 1) {
    const seller = sellers[i];
    const bucket = templateBuckets[i];
    if (!seller || !bucket) {
      continue;
    }
    createdProductCount += await seedProductsForSeller(seller._id, bucket);
  }

  const sellerIds = sellers.map((s) => s._id);
  const totalProductCount = await Product.countDocuments({ sellerId: { $in: sellerIds } });

  console.log("\n=== Seed Özeti ===");
  console.log(`Kullanıcılar: ${users.length} (${sellers.length} seller, ${users.length - sellers.length} customer)`);
  console.log(`Bu çalıştırmada eklenen ürün: ${createdProductCount}`);
  console.log(`Toplam ürün (seed satıcıları): ${totalProductCount}`);
  console.log("\nTest hesapları (şifre hepsinde: Test1234):");
  for (const seedUser of SEED_USERS) {
    console.log(`  [${seedUser.role}] ${seedUser.email}`);
  }

  await disconnectDatabase();
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error("Seed işlemi başarısız:", error);
  process.exit(1);
});
