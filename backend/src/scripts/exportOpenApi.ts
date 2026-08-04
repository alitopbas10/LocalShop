// OpenAPI dokümanını docs/openapi.json'a yazar. Bu dosya repoya commit'lenir ki
// değerlendiren kişi sunucuyu ayağa kaldırmadan da API sözleşmesini okuyabilsin.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { openApiDocument } from "@/docs/openapi";

const OUTPUT_PATH = join(__dirname, "../../docs/openapi.json");

mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
writeFileSync(OUTPUT_PATH, `${JSON.stringify(openApiDocument, null, 2)}\n`, "utf-8");

console.log(`OpenAPI document written to ${OUTPUT_PATH}`);
