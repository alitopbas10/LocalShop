import type { Collection, IndexDescriptionInfo } from "mongodb";

import { connectDatabase, disconnectDatabase } from "@/config/database";
import { User } from "@/modules/auth/user.model";
import { Payment } from "@/modules/payment/payment.model";
import { Product } from "@/modules/product/product.model";

interface SyncResult {
  modelName: string;
  dropped: string[];
  created: string[];
  finalIndexes: IndexDescriptionInfo[];
}

interface SyncableModel {
  collection: Collection;
  syncIndexes(): Promise<string[]>;
}

async function syncAndDiff(modelName: string, model: SyncableModel): Promise<SyncResult> {
  const before = await model.collection.indexes();
  const beforeNames = new Set(before.map((index) => index.name));

  const dropped = await model.syncIndexes();

  const after = await model.collection.indexes();
  const created = after
    .map((index) => index.name)
    .filter((name): name is string => name !== undefined && !beforeNames.has(name));

  return { modelName, dropped, created, finalIndexes: after };
}

function formatOptions(index: IndexDescriptionInfo): string {
  const parts: string[] = [];
  if (index.default_language) {
    parts.push(`default_language=${index.default_language}`);
  }
  if (index.weights) {
    parts.push(`weights=${JSON.stringify(index.weights)}`);
  }
  return parts.join(", ");
}

function printResult(result: SyncResult): void {
  console.log(`\n=== ${result.modelName} ===`);
  console.log(result.dropped.length > 0 ? `Dropped: ${result.dropped.join(", ")}` : "Dropped: (none)");
  console.log(result.created.length > 0 ? `Created: ${result.created.join(", ")}` : "Created: (none)");

  console.log("\nCurrent indexes:");
  console.log("-".repeat(80));
  for (const index of result.finalIndexes) {
    const keys = Object.entries(index.key)
      .map(([field, direction]) => `${field}:${direction}`)
      .join(", ");
    const options = formatOptions(index);
    console.log(`  ${index.name}\n    keys: { ${keys} }${options ? `\n    options: ${options}` : ""}`);
  }
}

function verifyTurkishTextIndex(productIndexes: IndexDescriptionInfo[]): boolean {
  const hasTurkishTextIndex = productIndexes.some(
    (index) => Object.values(index.key).includes("text") && index.default_language === "turkish",
  );

  if (!hasTurkishTextIndex) {
    console.warn("\n⚠️  products koleksiyonunda default_language='turkish' olan bir text index bulunamadı.");
    return false;
  }

  console.log("\n✅ Turkish text index verified");
  return true;
}

async function main(): Promise<void> {
  await connectDatabase();

  const productResult = await syncAndDiff("Product", Product);
  printResult(productResult);

  const userResult = await syncAndDiff("User", User);
  printResult(userResult);

  const paymentResult = await syncAndDiff("Payment", Payment);
  printResult(paymentResult);

  const isTurkishTextIndexValid = verifyTurkishTextIndex(productResult.finalIndexes);

  await disconnectDatabase();
  process.exit(isTurkishTextIndexValid ? 0 : 1);
}

main().catch((error: unknown) => {
  console.error("Index senkronizasyonu başarısız:", error);
  process.exit(1);
});
