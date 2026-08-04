// OpenAPI dokümanı Zod şemalarından programatik olarak inşa edilir: elle yazılan bir
// dokümanın aksine, bir Zod şeması değiştiğinde (yeni alan, farklı kısıt) doküman bir
// sonraki `npm run docs:export` çalıştırmasında otomatik olarak güncel kalır.
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { z, type ZodType } from "zod";

import { registerSchema, loginSchema } from "@/modules/auth/auth.schemas";
import { USER_ROLES } from "@/modules/auth/user.types";
import { addItemSchema, updateItemSchema } from "@/modules/cart/cart.schemas";
import {
  createOrderSchema,
  customerOrderQuerySchema,
  sellerOrderQuerySchema,
  updateFulfillmentSchema,
} from "@/modules/order/order.schemas";
import { FULFILLMENT_STATUSES, ORDER_STATUSES } from "@/modules/order/order.types";
import { payCardSchema } from "@/modules/payment/payment.schemas";
import { PAYMENT_FAILURE_REASONS, PAYMENT_STATUSES } from "@/modules/payment/payment.types";
import { catalogQuerySchema } from "@/modules/product/catalog.schemas";
import {
  createProductSchema,
  sellerProductQuerySchema,
  updateProductSchema,
} from "@/modules/product/product.schemas";
import { PRODUCT_CATEGORIES } from "@/modules/product/product.types";
import { paginationSchema } from "@/shared/commonSchemas";
import { errorCodes } from "@/shared/errorCodes";

type JsonSchema = Record<string, unknown>;

interface PackageJson {
  version: string;
}

const packageJson = JSON.parse(
  readFileSync(join(__dirname, "../../package.json"), "utf-8"),
) as PackageJson;

// ---- ZOD -> JSON SCHEMA ----

// io: "input" seçilir çünkü birçok şema .transform()/.preprocess() kullanır (ör.
// payCardSchema kart numarasındaki boşlukları temizler, catalogQuerySchema boş
// arama string'ini undefined'a çevirir). Zod'un varsayılan "output" modu transform'ları
// JSON Schema'ya çeviremediği için hata fırlatır ("Transforms cannot be represented in
// JSON Schema"); "input" modu bunun yerine istemcinin GÖNDERMESİ gereken şekli üretir —
// tam olarak bir API dokümanının tarif etmesi gereken şey de budur.
function zodToSchema(schema: ZodType): JsonSchema {
  const jsonSchema = z.toJSONSchema(schema, { io: "input" }) as JsonSchema;
  delete jsonSchema.$schema;
  return jsonSchema;
}

function ref(name: string): JsonSchema {
  return { $ref: `#/components/schemas/${name}` };
}

function arrayOf(itemSchema: JsonSchema): JsonSchema {
  return { type: "array", items: itemSchema };
}

function nullable(schema: JsonSchema): JsonSchema {
  return { oneOf: [schema, { type: "null" }] };
}

// ---- REQUEST/RESPONSE ŞEMALARI ----

const zodSchemas = {
  RegisterInput: zodToSchema(registerSchema),
  LoginInput: zodToSchema(loginSchema),
  CreateProductInput: zodToSchema(createProductSchema),
  UpdateProductInput: zodToSchema(updateProductSchema),
  AddItemInput: zodToSchema(addItemSchema),
  UpdateItemInput: zodToSchema(updateItemSchema),
  PayCardInput: zodToSchema(payCardSchema),
  UpdateFulfillmentInput: zodToSchema(updateFulfillmentSchema),
  CreateOrderInput: zodToSchema(createOrderSchema),
  PaginationQuery: zodToSchema(paginationSchema),
  CatalogQuery: zodToSchema(catalogQuerySchema),
  SellerProductQuery: zodToSchema(sellerProductQuerySchema),
  CustomerOrderQuery: zodToSchema(customerOrderQuerySchema),
  SellerOrderQuery: zodToSchema(sellerOrderQuerySchema),
} satisfies Record<string, JsonSchema>;

const objectId: JsonSchema = {
  type: "string",
  pattern: "^[0-9a-fA-F]{24}$",
  example: "665f1a2b3c4d5e6f70819293",
};

const dateTime: JsonSchema = { type: "string", format: "date-time" };

const handSchemas: Record<string, JsonSchema> = {
  ErrorCode: {
    type: "string",
    enum: Object.values(errorCodes),
    description: "Makine tarafından okunabilir hata kodu; mesaj metni kullanıcıya gösterilir, dallanma bu koda göre yapılır.",
  },
  ApiFailure: {
    type: "object",
    required: ["success", "error"],
    properties: {
      success: { type: "boolean", enum: [false] },
      error: {
        type: "object",
        required: ["message", "code"],
        properties: {
          message: { type: "string" },
          code: ref("ErrorCode"),
          details: { description: "Hata koduna özgü ek bilgi (ör. alan bazlı doğrulama hataları)." },
          requestId: { type: "string" },
          stack: { type: "string", description: "Yalnızca development ortamında ve 5xx hatalarında bulunur." },
        },
      },
    },
  },
  PaginationMeta: {
    type: "object",
    required: ["total", "page", "limit", "totalPages"],
    properties: {
      total: { type: "integer", minimum: 0 },
      page: { type: "integer", minimum: 1 },
      limit: { type: "integer", minimum: 1 },
      totalPages: { type: "integer", minimum: 0 },
    },
  },
  HealthStatus: {
    type: "object",
    required: ["status", "uptime", "timestamp"],
    properties: {
      status: { type: "string", enum: ["ok"] },
      uptime: { type: "number", description: "Process çalışma süresi (saniye)." },
      timestamp: dateTime,
    },
  },
  User: {
    type: "object",
    required: ["_id", "name", "email", "role", "createdAt", "updatedAt"],
    properties: {
      _id: objectId,
      name: { type: "string" },
      email: { type: "string", format: "email" },
      role: { type: "string", enum: USER_ROLES },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  AuthResult: {
    type: "object",
    required: ["user", "token"],
    properties: {
      user: ref("User"),
      token: { type: "string", description: "JWT access token; Authorization: Bearer <token> ile gönderilir." },
    },
  },
  SellerRef: {
    type: "object",
    required: ["_id", "name"],
    properties: {
      _id: objectId,
      name: nullable({ type: "string" }),
    },
  },
  CatalogListItem: {
    type: "object",
    required: ["_id", "name", "price", "stock", "category", "inStock", "seller", "createdAt"],
    properties: {
      _id: objectId,
      name: { type: "string" },
      price: { type: "number" },
      stock: { type: "integer" },
      category: { type: "string", enum: PRODUCT_CATEGORIES },
      imageUrl: { type: "string", format: "uri" },
      inStock: { type: "boolean" },
      seller: ref("SellerRef"),
      createdAt: dateTime,
    },
  },
  CatalogDetail: {
    type: "object",
    required: [
      "_id",
      "name",
      "description",
      "price",
      "stock",
      "category",
      "inStock",
      "seller",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: objectId,
      name: { type: "string" },
      description: { type: "string" },
      price: { type: "number" },
      stock: { type: "integer" },
      category: { type: "string", enum: PRODUCT_CATEGORIES },
      imageUrl: { type: "string", format: "uri" },
      inStock: { type: "boolean" },
      seller: ref("SellerRef"),
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  CategoryCount: {
    type: "object",
    required: ["value", "count"],
    properties: {
      value: { type: "string", enum: PRODUCT_CATEGORIES },
      count: { type: "integer", minimum: 0 },
    },
  },
  Product: {
    type: "object",
    required: [
      "_id",
      "name",
      "description",
      "price",
      "stock",
      "category",
      "sellerId",
      "isActive",
      "createdAt",
      "updatedAt",
    ],
    properties: {
      _id: objectId,
      name: { type: "string" },
      description: { type: "string" },
      price: { type: "number" },
      stock: { type: "integer" },
      category: { type: "string", enum: PRODUCT_CATEGORIES },
      sellerId: objectId,
      imageUrl: { type: "string", format: "uri" },
      isActive: { type: "boolean" },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  CartLineProduct: {
    type: "object",
    required: ["_id", "name", "price", "category", "stock"],
    properties: {
      _id: objectId,
      name: { type: "string" },
      price: { type: "number" },
      imageUrl: { type: "string", format: "uri" },
      category: { type: "string", enum: PRODUCT_CATEGORIES },
      stock: { type: "integer" },
    },
  },
  CartIssue: {
    type: "object",
    required: ["productId", "productName", "issue", "requested", "available"],
    properties: {
      productId: objectId,
      productName: { type: "string" },
      issue: { type: "string", enum: ["PRODUCT_UNAVAILABLE", "INSUFFICIENT_STOCK"] },
      requested: { type: "integer" },
      available: { type: "integer" },
    },
  },
  CartLineItem: {
    type: "object",
    required: [
      "productId",
      "quantity",
      "product",
      "unitPrice",
      "lineTotal",
      "available",
      "issue",
      "availableStock",
    ],
    properties: {
      productId: objectId,
      quantity: { type: "integer" },
      product: nullable(ref("CartLineProduct")),
      unitPrice: { type: "number" },
      lineTotal: { type: "number" },
      available: { type: "boolean" },
      issue: nullable({ type: "string", enum: ["PRODUCT_UNAVAILABLE", "INSUFFICIENT_STOCK"] }),
      availableStock: { type: "integer" },
    },
  },
  CartView: {
    type: "object",
    required: ["items", "itemCount", "distinctItemCount", "subtotal", "hasIssues", "issues"],
    properties: {
      items: arrayOf(ref("CartLineItem")),
      itemCount: { type: "integer", description: "Sepetteki toplam adet (satır sayısı değil)." },
      distinctItemCount: { type: "integer" },
      subtotal: {
        type: "number",
        description: "Yalnızca uygun (available: true) satırların toplamı.",
      },
      hasIssues: { type: "boolean" },
      issues: arrayOf(ref("CartIssue")),
    },
  },
  OrderItemView: {
    type: "object",
    required: ["productId", "sellerId", "name", "price", "quantity", "lineTotal", "fulfillmentStatus"],
    properties: {
      productId: objectId,
      sellerId: objectId,
      name: { type: "string", description: "Sipariş anındaki ürün adı (snapshot)." },
      price: { type: "number", description: "Sipariş anındaki birim fiyat (snapshot)." },
      quantity: { type: "integer" },
      lineTotal: { type: "number" },
      fulfillmentStatus: { type: "string", enum: FULFILLMENT_STATUSES },
    },
  },
  Order: {
    type: "object",
    required: ["_id", "orderNumber", "userId", "items", "totalPrice", "status", "sellerIds", "createdAt", "updatedAt"],
    properties: {
      _id: objectId,
      orderNumber: { type: "string" },
      userId: objectId,
      items: arrayOf(ref("OrderItemView")),
      totalPrice: { type: "number" },
      status: { type: "string", enum: ORDER_STATUSES },
      sellerIds: arrayOf(objectId),
      paidAt: dateTime,
      cancelledAt: dateTime,
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  BuyerRef: {
    type: "object",
    required: ["name"],
    properties: {
      name: nullable({ type: "string" }),
    },
  },
  SellerOrderItemView: {
    type: "object",
    required: ["productId", "name", "price", "quantity", "lineTotal", "fulfillmentStatus"],
    properties: {
      productId: objectId,
      name: { type: "string" },
      price: { type: "number" },
      quantity: { type: "integer" },
      lineTotal: { type: "number" },
      fulfillmentStatus: { type: "string", enum: FULFILLMENT_STATUSES },
    },
  },
  SellerOrder: {
    type: "object",
    required: [
      "_id",
      "orderNumber",
      "status",
      "createdAt",
      "buyer",
      "items",
      "sellerSubtotal",
      "itemCount",
      "hasOtherSellers",
    ],
    properties: {
      _id: objectId,
      orderNumber: { type: "string" },
      status: { type: "string", enum: ORDER_STATUSES },
      createdAt: dateTime,
      buyer: ref("BuyerRef"),
      items: arrayOf(ref("SellerOrderItemView")),
      sellerSubtotal: {
        type: "number",
        description: "order.totalPrice DEĞİL: yalnızca bu satıcının kendi satırlarının toplamı.",
      },
      itemCount: { type: "integer" },
      hasOtherSellers: {
        type: "boolean",
        description: "Siparişte başka satıcıların da satırı var mı (içerikleri sızdırılmaz).",
      },
    },
  },
  Payment: {
    type: "object",
    required: ["_id", "orderId", "userId", "amount", "status", "cardLast4", "cardBrand", "transactionId", "createdAt", "updatedAt"],
    properties: {
      _id: objectId,
      orderId: objectId,
      userId: objectId,
      amount: { type: "number" },
      status: { type: "string", enum: PAYMENT_STATUSES },
      cardLast4: { type: "string", pattern: "^\\d{4}$" },
      cardBrand: { type: "string", example: "VISA" },
      failureReason: { type: "string", enum: PAYMENT_FAILURE_REASONS },
      transactionId: { type: "string", example: "FP-1a2b3c4d5e6f" },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
  },
  PayOrderResult: {
    type: "object",
    required: ["payment", "order"],
    properties: {
      payment: ref("Payment"),
      order: {
        type: "object",
        required: ["_id", "orderNumber", "status", "totalPrice"],
        properties: {
          _id: objectId,
          orderNumber: { type: "string" },
          status: { type: "string", enum: ORDER_STATUSES },
          totalPrice: { type: "number" },
        },
      },
    },
  },
};

const schemas: Record<string, JsonSchema> = { ...zodSchemas, ...handSchemas };

// ---- ÖRNEK VERİ ----

// Seed script'indeki (src/scripts/seed.ts) ve securityAudit.ts'teki hesaplarla aynı id'ler
// ve kimlik bilgileri kullanılır ki değerlendiren kişi Swagger UI'daki örnekleri
// kopyala-yapıştır ile denediğinde gerçekten çalışsın.
const EXAMPLE_ID = {
  customer: "665f1a2b3c4d5e6f70819201",
  seller: "665f1a2b3c4d5e6f70819202",
  // Kullanıcının talep ettiği, yaygın bilinen örnek Mongo ObjectId.
  product: "507f1f77bcf86cd799439011",
  order: "665f1a2b3c4d5e6f70819401",
  paymentSucceeded: "665f1a2b3c4d5e6f70819501",
  paymentFailed: "665f1a2b3c4d5e6f70819502",
} as const;

const EX_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2NjVmMWEyYjNjNGQ1ZTZmNzA4MTkyMDEiLCJyb2xlIjoiY3VzdG9tZXIiLCJpYXQiOjE3NjgwMDAwMDAsImV4cCI6MTc2ODA4NjQwMH0.9x0z1y2w3v4u5t6s7r8q9p0o1n2m3l4k5j6i7h8g9f0e1d2c";

const EX_USER = {
  _id: EXAMPLE_ID.customer,
  name: "Ayşe Yılmaz",
  email: "customer1@localshop.dev",
  role: "customer",
  createdAt: "2026-01-15T10:30:00.000Z",
  updatedAt: "2026-01-15T10:30:00.000Z",
};

const EX_SELLER_USER = {
  _id: EXAMPLE_ID.seller,
  name: "Mehmet Demir",
  email: "seller1@localshop.dev",
  role: "seller",
  createdAt: "2026-01-10T09:00:00.000Z",
  updatedAt: "2026-01-10T09:00:00.000Z",
};

const EX_SELLER_REF = { _id: EXAMPLE_ID.seller, name: "Mehmet Demir" };

const EX_PRODUCT_IMAGE_URL = "https://images.localshop.dev/products/kestane-bali.jpg";

const EX_CATALOG_ITEM = {
  _id: EXAMPLE_ID.product,
  name: "Kestane Balı",
  price: 450.5,
  stock: 25,
  category: "food",
  imageUrl: EX_PRODUCT_IMAGE_URL,
  inStock: true,
  seller: EX_SELLER_REF,
  createdAt: "2026-01-20T08:00:00.000Z",
};

const EX_CATALOG_DETAIL = {
  ...EX_CATALOG_ITEM,
  description: "Marmaris yöresinden doğal kestane balı, 850g cam kavanoz",
  updatedAt: "2026-01-20T08:00:00.000Z",
};

const EX_PRODUCT = {
  _id: EXAMPLE_ID.product,
  name: "Kestane Balı",
  description: "Marmaris yöresinden doğal kestane balı, 850g cam kavanoz",
  price: 450.5,
  stock: 25,
  category: "food",
  sellerId: EXAMPLE_ID.seller,
  imageUrl: EX_PRODUCT_IMAGE_URL,
  isActive: true,
  createdAt: "2026-01-20T08:00:00.000Z",
  updatedAt: "2026-01-20T08:00:00.000Z",
};

const EX_CATEGORY_COUNTS = [
  { value: "food", count: 18 },
  { value: "beverage", count: 6 },
  { value: "handcraft", count: 11 },
  { value: "textile", count: 4 },
  { value: "cosmetics", count: 3 },
  { value: "home", count: 7 },
  { value: "other", count: 2 },
];

const EX_CART_LINE_ITEM = {
  productId: EXAMPLE_ID.product,
  quantity: 2,
  product: {
    _id: EXAMPLE_ID.product,
    name: "Kestane Balı",
    price: 450.5,
    imageUrl: EX_PRODUCT_IMAGE_URL,
    category: "food",
    stock: 25,
  },
  unitPrice: 450.5,
  lineTotal: 901,
  available: true,
  issue: null,
  availableStock: 25,
};

const EX_CART_VIEW = {
  items: [EX_CART_LINE_ITEM],
  itemCount: 2,
  distinctItemCount: 1,
  subtotal: 901,
  hasIssues: false,
  issues: [],
};

const EX_EMPTY_CART_VIEW = {
  items: [],
  itemCount: 0,
  distinctItemCount: 0,
  subtotal: 0,
  hasIssues: false,
  issues: [],
};

const EX_ORDER_ITEM = {
  productId: EXAMPLE_ID.product,
  sellerId: EXAMPLE_ID.seller,
  name: "Kestane Balı",
  price: 450.5,
  quantity: 2,
  lineTotal: 901,
  fulfillmentStatus: "PENDING",
};

const EX_ORDER = {
  _id: EXAMPLE_ID.order,
  orderNumber: "LS-20260204-0007",
  userId: EXAMPLE_ID.customer,
  items: [EX_ORDER_ITEM],
  totalPrice: 901,
  status: "PENDING_PAYMENT",
  sellerIds: [EXAMPLE_ID.seller],
  createdAt: "2026-02-04T11:00:00.000Z",
  updatedAt: "2026-02-04T11:00:00.000Z",
};

const EX_CANCELLED_ORDER = {
  ...EX_ORDER,
  status: "CANCELLED",
  cancelledAt: "2026-02-04T11:10:00.000Z",
  updatedAt: "2026-02-04T11:10:00.000Z",
  items: [{ ...EX_ORDER_ITEM, fulfillmentStatus: "CANCELLED" }],
};

const EX_SELLER_ORDER_ITEM = {
  productId: EXAMPLE_ID.product,
  name: "Kestane Balı",
  price: 450.5,
  quantity: 2,
  lineTotal: 901,
  fulfillmentStatus: "PENDING",
};

const EX_SELLER_ORDER = {
  _id: EXAMPLE_ID.order,
  orderNumber: "LS-20260204-0007",
  status: "PAID",
  createdAt: "2026-02-04T11:00:00.000Z",
  buyer: { name: "Ayşe Yılmaz" },
  items: [EX_SELLER_ORDER_ITEM],
  sellerSubtotal: 901,
  itemCount: 2,
  hasOtherSellers: false,
};

const EX_SELLER_ORDER_SHIPPED = {
  ...EX_SELLER_ORDER,
  items: [{ ...EX_SELLER_ORDER_ITEM, fulfillmentStatus: "SHIPPED" }],
};

const EX_PAYMENT_SUCCEEDED = {
  _id: EXAMPLE_ID.paymentSucceeded,
  orderId: EXAMPLE_ID.order,
  userId: EXAMPLE_ID.customer,
  amount: 901,
  status: "SUCCEEDED",
  cardLast4: "4242",
  cardBrand: "VISA",
  transactionId: "FP-1a2b3c4d5e6f",
  createdAt: "2026-02-04T11:05:00.000Z",
  updatedAt: "2026-02-04T11:05:00.000Z",
};

const EX_PAYMENT_FAILED = {
  _id: EXAMPLE_ID.paymentFailed,
  orderId: EXAMPLE_ID.order,
  userId: EXAMPLE_ID.customer,
  amount: 901,
  status: "FAILED",
  cardLast4: "0000",
  cardBrand: "VISA",
  failureReason: "CARD_DECLINED",
  transactionId: "FP-7g8h9i0j1k2l",
  createdAt: "2026-02-04T11:03:00.000Z",
  updatedAt: "2026-02-04T11:03:00.000Z",
};

const EX_PAY_SUCCEEDED_RESULT = {
  payment: EX_PAYMENT_SUCCEEDED,
  order: { _id: EXAMPLE_ID.order, orderNumber: "LS-20260204-0007", status: "PAID", totalPrice: 901 },
};

const EX_PAY_FAILED_RESULT = {
  payment: EX_PAYMENT_FAILED,
  order: { _id: EXAMPLE_ID.order, orderNumber: "LS-20260204-0007", status: "PAYMENT_FAILED", totalPrice: 901 },
};

// ---- YARDIMCILAR: PARAMETRELER ----

function idPathParam(name: string, description: string, example: string = objectId.example as string): JsonSchema {
  return {
    name,
    in: "path",
    required: true,
    description,
    schema: { ...objectId, example },
  };
}

// Bir Zod query şemasının JSON Schema karşılığından OpenAPI "parameters" dizisi üretir;
// query şeması değiştiğinde (yeni filtre alanı vb.) parametre listesi elle senkronize
// edilmek zorunda kalınmaz. examples: Swagger UI'ın otomatik ürettiği (regex/format
// tabanlı, anlamsız) değerler yerine gerçekçi bir varsayılan göstermek için.
function queryParams(schema: JsonSchema, examples: Record<string, unknown> = {}): JsonSchema[] {
  const properties = (schema.properties ?? {}) as Record<string, JsonSchema>;
  const required = (schema.required ?? []) as string[];
  return Object.entries(properties).map(([name, propSchema]) => ({
    name,
    in: "query",
    required: required.includes(name),
    schema: name in examples ? { ...propSchema, example: examples[name] } : propSchema,
  }));
}

const IDEMPOTENCY_KEY_HEADER: JsonSchema = {
  name: "Idempotency-Key",
  in: "header",
  required: false,
  description:
    "Ödeme sayfası mount başına bir kez üretir; aynı anahtarla tekrar denemede yeni bir tahsilat başlatılmaz, önceki sonuç döner.",
  schema: { type: "string", example: "8f14e45f-ceea-4d5e-9f0a-1b2c3d4e5f60" },
};

function paginationExample(total: number, page = 1, limit = 20): JsonSchema {
  return { total, page, limit, totalPages: Math.ceil(total / limit) || 1 };
}

// ---- YARDIMCILAR: REQUEST BODY ----

interface NamedExample {
  summary?: string;
  value: unknown;
}

// example: tek bir örnek. examples: Swagger UI'da açılır listeden seçilebilen, adlandırılmış
// birden çok örnek (ör. login için müşteri/satıcı, ödeme için başarılı/başarısız).
function requestBody(
  schema: JsonSchema,
  options: { required?: boolean; example?: unknown; examples?: Record<string, NamedExample> } = {},
): JsonSchema {
  return {
    required: options.required ?? true,
    content: {
      "application/json": {
        schema,
        ...(options.example !== undefined ? { example: options.example } : {}),
        ...(options.examples ? { examples: options.examples } : {}),
      },
    },
  };
}

// ---- YARDIMCILAR: RESPONSE ZARFI ----

function successEnvelope(dataSchema: JsonSchema, metaSchema?: JsonSchema): JsonSchema {
  return {
    type: "object",
    required: ["success", "data"],
    properties: {
      success: { type: "boolean", enum: [true] },
      data: dataSchema,
      ...(metaSchema ? { meta: metaSchema } : {}),
    },
  };
}

function jsonContent(
  schema: JsonSchema,
  options: { example?: unknown; examples?: Record<string, NamedExample> } = {},
): JsonSchema {
  return {
    "application/json": {
      schema,
      ...(options.example !== undefined ? { example: options.example } : {}),
      ...(options.examples ? { examples: options.examples } : {}),
    },
  };
}

// data: başarılı response'un "data" alanındaki gerçekçi örnek değer (şema değil, ham veri).
// metaSchema/metaExample: sayfalama gibi opsiyonel "meta" alanı için ayrı şema + örnek.
function successResponse(
  description: string,
  dataSchema: JsonSchema,
  options: {
    metaSchema?: JsonSchema;
    data?: unknown;
    metaExample?: unknown;
    examples?: Record<string, NamedExample>;
  } = {},
): JsonSchema {
  const example =
    options.data !== undefined
      ? {
          success: true,
          data: options.data,
          ...(options.metaExample !== undefined ? { meta: options.metaExample } : {}),
        }
      : undefined;

  return {
    description,
    content: jsonContent(successEnvelope(dataSchema, options.metaSchema), {
      example,
      examples: options.examples,
    }),
  };
}

function errorExample(code: string, message: string, details?: unknown): JsonSchema {
  return {
    success: false,
    error: { message, code, ...(details !== undefined ? { details } : {}) },
  };
}

function errorResponse(description: string, code: string, message: string, details?: unknown): JsonSchema {
  return {
    description,
    content: jsonContent(ref("ApiFailure"), { example: errorExample(code, message, details) }),
  };
}

// validate middleware şema doğrulama hatalarında 422 döner (AppError.validation),
// AppError.badRequest kaynaklı iş kuralı hataları 400 döner — ikisi de VALIDATION_ERROR
// kodunu taşır ama HTTP durumu farklıdır; bu ayrım kaynak koddaki gerçek davranışı yansıtır.
const validationErrorResponse = (details: unknown): JsonSchema =>
  errorResponse(
    "Request body/query/params did not pass Zod validation",
    errorCodes.VALIDATION_ERROR,
    "Request validation failed",
    details,
  );

const unauthorizedResponse = (message = "Authentication required"): JsonSchema =>
  errorResponse("Missing, invalid or expired access token", errorCodes.UNAUTHORIZED, message);

const forbiddenResponse = (
  message = "You do not have permission to perform this action",
): JsonSchema => errorResponse("Authenticated but not authorized for this resource", errorCodes.FORBIDDEN, message);

const notFoundResponse = (resource: string): JsonSchema =>
  errorResponse(`${resource} not found`, errorCodes.NOT_FOUND, `${resource} not found`);

const rateLimitedResponse = (message: string): JsonSchema =>
  errorResponse("Rate limit exceeded", errorCodes.RATE_LIMIT_EXCEEDED, message);

// cart.service.ts: hem addItem hem updateItemQuantity, istenen adet stoktan fazlaysa bu
// TAM koda ve durum kodunu fırlatır — AppError.badRequest DEĞİL, ayrı bir AppError
// (BAD_REQUEST + INSUFFICIENT_STOCK). VALIDATION_ERROR ile karıştırılmamalı.
const insufficientStockResponse = (requested: number, available: number): JsonSchema =>
  errorResponse(
    "Requested quantity exceeds available stock",
    errorCodes.INSUFFICIENT_STOCK,
    "Insufficient stock",
    { requested, available },
  );

const BEARER_AUTH: JsonSchema[] = [{ bearerAuth: [] }];

// ---- PATHS ----

const paths: Record<string, JsonSchema> = {
  "/health": {
    get: {
      tags: ["System"],
      summary: "Sağlık kontrolü",
      description: "Rate limit ve authentication dışında tutulur; izleme sistemleri tarafından sık çağrılır.",
      responses: {
        200: successResponse("Servis ayakta", ref("HealthStatus"), {
          data: { status: "ok", uptime: 12345.67, timestamp: "2026-02-04T11:00:00.000Z" },
        }),
      },
    },
  },

  "/api/auth/register": {
    post: {
      tags: ["Auth"],
      summary: "Kayıt ol",
      description: "customer veya seller rolüyle yeni bir hesap oluşturur ve bir access token döner.",
      requestBody: requestBody(ref("RegisterInput"), {
        example: {
          name: "Ayşe Yılmaz",
          email: "ayse.yilmaz@example.com",
          password: "Uretici2026",
          role: "seller",
        },
      }),
      responses: {
        201: successResponse("Hesap oluşturuldu", ref("AuthResult"), {
          data: { user: EX_SELLER_USER, token: EX_TOKEN },
        }),
        422: validationErrorResponse([
          { source: "body", field: "password", message: "Password must contain at least one letter and one number" },
        ]),
        409: errorResponse("E-posta zaten kayıtlı", errorCodes.DUPLICATE_RESOURCE, "email is already in use"),
        429: rateLimitedResponse("Too many attempts, please try again later"),
      },
    },
  },

  "/api/auth/login": {
    post: {
      tags: ["Auth"],
      summary: "Giriş yap",
      requestBody: requestBody(ref("LoginInput"), {
        examples: {
          customer: {
            summary: "Müşteri girişi",
            value: { email: "customer1@localshop.dev", password: "Test1234" },
          },
          seller: {
            summary: "Satıcı girişi",
            value: { email: "seller1@localshop.dev", password: "Test1234" },
          },
        },
      }),
      responses: {
        200: successResponse("Giriş başarılı", ref("AuthResult"), {
          examples: {
            customer: {
              summary: "Müşteri girişi",
              value: { success: true, data: { user: EX_USER, token: EX_TOKEN } },
            },
            seller: {
              summary: "Satıcı girişi",
              value: { success: true, data: { user: EX_SELLER_USER, token: EX_TOKEN } },
            },
          },
        }),
        422: validationErrorResponse([
          { source: "body", field: "email", message: "Invalid email address" },
        ]),
        401: errorResponse(
          "Kimlik bilgileri hatalı",
          errorCodes.INVALID_CREDENTIALS,
          "Invalid email or password",
        ),
        429: rateLimitedResponse("Too many attempts, please try again later"),
      },
    },
  },

  "/api/auth/me": {
    get: {
      tags: ["Auth"],
      summary: "Giriş yapmış kullanıcıyı getir",
      security: BEARER_AUTH,
      responses: {
        200: successResponse("Güncel kullanıcı", ref("User"), { data: EX_USER }),
        401: unauthorizedResponse(),
      },
    },
  },

  "/api/products/categories": {
    get: {
      tags: ["Catalog"],
      summary: "Kategori listesini ürün sayılarıyla getir",
      description: "Ürünü olmayan kategoriler de count:0 ile listede yer alır.",
      responses: {
        200: successResponse("Kategori sayıları", arrayOf(ref("CategoryCount")), { data: EX_CATEGORY_COUNTS }),
      },
    },
  },

  "/api/products": {
    get: {
      tags: ["Catalog"],
      summary: "Herkese açık ürün kataloğunu listele",
      description: "Yalnızca isActive: true olan ürünler döner.",
      parameters: queryParams(schemas.CatalogQuery as JsonSchema, {
        page: 1,
        limit: 20,
        category: "food",
        search: "bal",
        minPrice: 100,
        maxPrice: 1000,
        sort: "priceAsc",
      }),
      responses: {
        200: successResponse("Ürün listesi", arrayOf(ref("CatalogListItem")), {
          metaSchema: ref("PaginationMeta"),
          data: [EX_CATALOG_ITEM],
          metaExample: paginationExample(24, 1, 20),
        }),
        422: validationErrorResponse([
          { source: "query", field: "maxPrice", message: "minPrice cannot be greater than maxPrice" },
        ]),
      },
    },
  },

  "/api/products/{id}": {
    get: {
      tags: ["Catalog"],
      summary: "Ürün detayını getir",
      description: "Pasif (isActive: false) bir ürün için de 404 döner.",
      parameters: [idPathParam("id", "Ürün id'si", EXAMPLE_ID.product)],
      responses: {
        200: successResponse("Ürün detayı", ref("CatalogDetail"), { data: EX_CATALOG_DETAIL }),
        422: validationErrorResponse([{ source: "params", field: "id", message: "Invalid id format" }]),
        404: notFoundResponse("Product"),
      },
    },
  },

  "/api/seller/products": {
    post: {
      tags: ["Seller Products"],
      summary: "Yeni ürün oluştur",
      security: BEARER_AUTH,
      requestBody: requestBody(ref("CreateProductInput"), {
        example: {
          name: "Kestane Balı",
          description: "Marmaris yöresinden doğal kestane balı, 850g cam kavanoz",
          price: 450.5,
          stock: 25,
          category: "food",
        },
      }),
      responses: {
        201: successResponse("Ürün oluşturuldu", ref("Product"), { data: EX_PRODUCT }),
        422: validationErrorResponse([
          { source: "body", field: "price", message: "Too small: expected number to be >0" },
        ]),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
      },
    },
    get: {
      tags: ["Seller Products"],
      summary: "Kendi ürünlerini listele",
      description: "isActive filtresi verilmezse pasif ürünler de (satıcının arşivi) dahil edilir.",
      security: BEARER_AUTH,
      parameters: queryParams(schemas.SellerProductQuery as JsonSchema, {
        page: 1,
        limit: 20,
        category: "food",
        isActive: "true",
        sort: "newest",
      }),
      responses: {
        200: successResponse("Satıcının ürünleri", arrayOf(ref("Product")), {
          metaSchema: ref("PaginationMeta"),
          data: [EX_PRODUCT],
          metaExample: paginationExample(6, 1, 20),
        }),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
      },
    },
  },

  "/api/seller/products/{id}": {
    get: {
      tags: ["Seller Products"],
      summary: "Kendi ürününü id ile getir",
      security: BEARER_AUTH,
      parameters: [idPathParam("id", "Ürün id'si", EXAMPLE_ID.product)],
      responses: {
        200: successResponse("Ürün", ref("Product"), { data: EX_PRODUCT }),
        401: unauthorizedResponse(),
        403: forbiddenResponse("You do not have permission to access this product"),
        404: notFoundResponse("Product"),
      },
    },
    patch: {
      tags: ["Seller Products"],
      summary: "Ürünü güncelle",
      security: BEARER_AUTH,
      parameters: [idPathParam("id", "Ürün id'si", EXAMPLE_ID.product)],
      requestBody: requestBody(ref("UpdateProductInput"), { example: { stock: 35 } }),
      responses: {
        200: successResponse("Güncellenmiş ürün", ref("Product"), {
          data: { ...EX_PRODUCT, stock: 35, updatedAt: "2026-02-01T09:15:00.000Z" },
        }),
        422: validationErrorResponse([
          { source: "body", field: "root", message: "At least one field must be provided" },
        ]),
        401: unauthorizedResponse(),
        403: forbiddenResponse("You do not have permission to access this product"),
        404: notFoundResponse("Product"),
      },
    },
    delete: {
      tags: ["Seller Products"],
      summary: "Ürünü pasifleştir (soft delete)",
      description: "Ürün fiziksel olarak silinmez; isActive: false yapılır, katalogdan gizlenir.",
      security: BEARER_AUTH,
      parameters: [idPathParam("id", "Ürün id'si", EXAMPLE_ID.product)],
      responses: {
        200: successResponse("Pasifleştirilmiş ürün", ref("Product"), {
          data: { ...EX_PRODUCT, isActive: false },
        }),
        401: unauthorizedResponse(),
        403: forbiddenResponse("You do not have permission to access this product"),
        404: notFoundResponse("Product"),
        409: errorResponse(
          "Ürün zaten pasif",
          errorCodes.DUPLICATE_RESOURCE,
          "Product is already inactive",
        ),
      },
    },
  },

  "/api/seller/products/{id}/activate": {
    patch: {
      tags: ["Seller Products"],
      summary: "Pasif ürünü yeniden aktive et",
      security: BEARER_AUTH,
      parameters: [idPathParam("id", "Ürün id'si", EXAMPLE_ID.product)],
      responses: {
        200: successResponse("Aktive edilmiş ürün", ref("Product"), { data: EX_PRODUCT }),
        401: unauthorizedResponse(),
        403: forbiddenResponse("You do not have permission to access this product"),
        404: notFoundResponse("Product"),
      },
    },
  },

  "/api/cart": {
    get: {
      tags: ["Cart"],
      summary: "Sepeti getir",
      description: "Sepet yoksa boş bir sepet oluşturulup döner. Fiyatlar her okumada üründen canlı çekilir.",
      security: BEARER_AUTH,
      responses: {
        200: successResponse("Sepet görünümü", ref("CartView"), { data: EX_CART_VIEW }),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
      },
    },
    delete: {
      tags: ["Cart"],
      summary: "Sepeti tamamen boşalt",
      security: BEARER_AUTH,
      responses: {
        200: successResponse("Boşaltılmış sepet", ref("CartView"), { data: EX_EMPTY_CART_VIEW }),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
      },
    },
  },

  "/api/cart/items": {
    post: {
      tags: ["Cart"],
      summary: "Sepete ürün ekle",
      description: "Ürün zaten sepette varsa adet ÜZERİNE EKLENİR, üzerine yazılmaz.",
      security: BEARER_AUTH,
      requestBody: requestBody(ref("AddItemInput"), {
        example: { productId: EXAMPLE_ID.product, quantity: 2 },
      }),
      responses: {
        200: successResponse("Güncellenmiş sepet", ref("CartView"), { data: EX_CART_VIEW }),
        422: validationErrorResponse([
          { source: "body", field: "productId", message: "Invalid id format" },
        ]),
        400: insufficientStockResponse(5, 2),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
        404: notFoundResponse("Product"),
      },
    },
  },

  "/api/cart/items/{productId}": {
    patch: {
      tags: ["Cart"],
      summary: "Sepetteki ürün adedini güncelle",
      description: "quantity: 0 gönderilirse ürün sepetten kaldırılır (adet MUTLAK olarak atanır, artırılmaz).",
      security: BEARER_AUTH,
      parameters: [idPathParam("productId", "Ürün id'si", EXAMPLE_ID.product)],
      requestBody: requestBody(ref("UpdateItemInput"), { example: { quantity: 3 } }),
      responses: {
        200: successResponse("Güncellenmiş sepet", ref("CartView"), {
          data: {
            ...EX_CART_VIEW,
            items: [{ ...EX_CART_LINE_ITEM, quantity: 3, lineTotal: 1351.5 }],
            itemCount: 3,
            subtotal: 1351.5,
          },
        }),
        422: validationErrorResponse([
          { source: "body", field: "quantity", message: "Too big: expected number to be <=99" },
        ]),
        400: insufficientStockResponse(5, 2),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
        404: notFoundResponse("Cart item"),
      },
    },
    delete: {
      tags: ["Cart"],
      summary: "Sepetten ürün çıkar",
      security: BEARER_AUTH,
      parameters: [idPathParam("productId", "Ürün id'si", EXAMPLE_ID.product)],
      responses: {
        200: successResponse("Güncellenmiş sepet", ref("CartView"), { data: EX_EMPTY_CART_VIEW }),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
        404: notFoundResponse("Cart item"),
      },
    },
  },

  "/api/orders": {
    post: {
      tags: ["Orders"],
      summary: "Sepetten sipariş oluştur",
      description:
        "Sipariş içeriği istemciden alınmaz, sunucudaki sepetten okunur; body boş olmalıdır. Stok düşümü, " +
        "sipariş oluşturma ve sepet temizleme tek transaction içindedir.",
      security: BEARER_AUTH,
      requestBody: requestBody(ref("CreateOrderInput"), { required: false, example: {} }),
      responses: {
        201: successResponse("Oluşturulan sipariş", ref("Order"), { data: EX_ORDER }),
        400: errorResponse("Sepet boş", errorCodes.VALIDATION_ERROR, "Cart is empty"),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
        409: errorResponse(
          "Sepetteki bir veya daha fazla ürün artık istenen adette mevcut değil",
          errorCodes.INSUFFICIENT_STOCK,
          "One or more items are no longer available in the requested quantity",
          { productId: EXAMPLE_ID.product, requestedQuantity: 3 },
        ),
      },
    },
    get: {
      tags: ["Orders"],
      summary: "Kendi siparişlerini listele",
      security: BEARER_AUTH,
      parameters: queryParams(schemas.CustomerOrderQuery as JsonSchema, {
        page: 1,
        limit: 20,
        status: "PAID",
        sort: "newest",
      }),
      responses: {
        200: successResponse("Sipariş listesi", arrayOf(ref("Order")), {
          metaSchema: ref("PaginationMeta"),
          data: [EX_ORDER],
          metaExample: paginationExample(5, 1, 20),
        }),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
      },
    },
  },

  "/api/orders/{id}": {
    get: {
      tags: ["Orders"],
      summary: "Kendi siparişini id ile getir",
      security: BEARER_AUTH,
      parameters: [idPathParam("id", "Sipariş id'si", EXAMPLE_ID.order)],
      responses: {
        200: successResponse("Sipariş", ref("Order"), { data: EX_ORDER }),
        401: unauthorizedResponse(),
        403: forbiddenResponse("You do not have permission to access this order"),
        404: notFoundResponse("Order"),
      },
    },
  },

  "/api/orders/{id}/cancel": {
    patch: {
      tags: ["Orders"],
      summary: "Siparişi iptal et",
      description: "Yalnızca PENDING_PAYMENT veya PAYMENT_FAILED durumundaki siparişler iptal edilebilir; rezerve stok geri verilir.",
      security: BEARER_AUTH,
      parameters: [idPathParam("id", "Sipariş id'si", EXAMPLE_ID.order)],
      responses: {
        200: successResponse("İptal edilmiş sipariş", ref("Order"), { data: EX_CANCELLED_ORDER }),
        401: unauthorizedResponse(),
        403: forbiddenResponse("You do not have permission to access this order"),
        404: notFoundResponse("Order"),
        409: errorResponse(
          "Sipariş bu durumdan iptal edilemez",
          errorCodes.INVALID_STATE_TRANSITION,
          "Order cannot be cancelled from status SHIPPED",
        ),
      },
    },
  },

  "/api/seller/orders": {
    get: {
      tags: ["Seller Orders"],
      summary: "Satıcıya gelen siparişleri listele",
      description: "Her siparişte yalnızca bu satıcıya ait satırlar (items) ve sellerSubtotal döner; diğer satıcıların satırları filtrelenir.",
      security: BEARER_AUTH,
      parameters: queryParams(schemas.SellerOrderQuery as JsonSchema, {
        page: 1,
        limit: 20,
        status: "PAID",
        fulfillmentStatus: "PENDING",
        sort: "newest",
      }),
      responses: {
        200: successResponse("Satıcı sipariş listesi", arrayOf(ref("SellerOrder")), {
          metaSchema: ref("PaginationMeta"),
          data: [EX_SELLER_ORDER],
          metaExample: paginationExample(3, 1, 20),
        }),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
      },
    },
  },

  "/api/seller/orders/{id}": {
    get: {
      tags: ["Seller Orders"],
      summary: "Satıcıya gelen siparişi id ile getir",
      description: "Bu satıcının hiç satırı olmadığı bir sipariş için 403 yerine 404 döner (varlığını sızdırmamak için).",
      security: BEARER_AUTH,
      parameters: [idPathParam("id", "Sipariş id'si", EXAMPLE_ID.order)],
      responses: {
        200: successResponse("Satıcı sipariş görünümü", ref("SellerOrder"), { data: EX_SELLER_ORDER }),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
        404: notFoundResponse("Order"),
      },
    },
  },

  "/api/seller/orders/{id}/fulfillment": {
    patch: {
      tags: ["Seller Orders"],
      summary: "Kargo durumunu güncelle",
      description: "Satıcı yalnızca SHIPPED veya DELIVERED durumuna geçirebilir; ödemesi tamamlanmamış siparişlerde reddedilir.",
      security: BEARER_AUTH,
      parameters: [idPathParam("id", "Sipariş id'si", EXAMPLE_ID.order)],
      requestBody: requestBody(ref("UpdateFulfillmentInput"), { example: { status: "SHIPPED" } }),
      responses: {
        200: successResponse("Güncellenmiş satıcı sipariş görünümü", ref("SellerOrder"), {
          data: EX_SELLER_ORDER_SHIPPED,
        }),
        422: validationErrorResponse([
          { source: "body", field: "status", message: 'Invalid option: expected one of "SHIPPED"|"DELIVERED"' },
        ]),
        401: unauthorizedResponse(),
        403: forbiddenResponse(),
        404: notFoundResponse("Order"),
        409: errorResponse(
          "Kargo durumu bu durumdan güncellenemez",
          errorCodes.INVALID_STATE_TRANSITION,
          "Fulfillment status cannot be updated while payment is not completed (order status: PENDING_PAYMENT)",
        ),
      },
    },
  },

  "/api/payments/pay": {
    post: {
      tags: ["Payments"],
      summary: "Sipariş için ödeme yap",
      description:
        "Tutar siparişten (order.totalPrice) okunur, istemciden alınmaz. Idempotency-Key header'ı ile tekrar " +
        "denemede aynı sonuç döner, kart iki kez çekilmez. Kart bilgileri hiçbir yere yazılmaz. FakePay " +
        "simülasyonunda yalnızca 4242424242424242 başarılı olur; 4000000000000000 CARD_DECLINED ile başarısız olur.",
      security: BEARER_AUTH,
      parameters: [IDEMPOTENCY_KEY_HEADER],
      requestBody: requestBody(ref("PayCardInput"), {
        examples: {
          success: {
            summary: "Başarılı ödeme",
            value: {
              orderId: EXAMPLE_ID.order,
              cardNumber: "4242424242424242",
              cardHolder: "ALI TOPBAS",
              expiry: "12/30",
              cvv: "123",
            },
          },
          declined: {
            summary: "Başarısız ödeme",
            value: {
              orderId: EXAMPLE_ID.order,
              cardNumber: "4000000000000000",
              cardHolder: "ALI TOPBAS",
              expiry: "12/30",
              cvv: "123",
            },
          },
        },
      }),
      responses: {
        200: successResponse("Ödeme sonucu (başarılı veya başarısız denemeyi de içerir)", ref("PayOrderResult"), {
          examples: {
            success: {
              summary: "Başarılı ödeme",
              value: { success: true, data: EX_PAY_SUCCEEDED_RESULT },
            },
            declined: {
              summary: "Başarısız ödeme",
              value: { success: true, data: EX_PAY_FAILED_RESULT },
            },
          },
        }),
        422: validationErrorResponse([
          { source: "body", field: "cardNumber", message: "Card number must be 13-19 digits" },
        ]),
        401: unauthorizedResponse(),
        403: forbiddenResponse("You do not have permission to pay for this order"),
        404: notFoundResponse("Order"),
        409: errorResponse(
          "Sipariş zaten ödenmiş",
          errorCodes.INVALID_STATE_TRANSITION,
          "Order has already been paid",
        ),
        429: rateLimitedResponse("Too many payment attempts, please try again later"),
      },
    },
  },

  "/api/payments/order/{orderId}": {
    get: {
      tags: ["Payments"],
      summary: "Bir siparişin tüm ödeme denemelerini listele",
      description: "Başarılı ve başarısız tüm denemeler en yeniden en eskiye döner.",
      security: BEARER_AUTH,
      parameters: [idPathParam("orderId", "Sipariş id'si", EXAMPLE_ID.order)],
      responses: {
        200: successResponse("Ödeme denemeleri", arrayOf(ref("Payment")), {
          data: [EX_PAYMENT_SUCCEEDED, EX_PAYMENT_FAILED],
        }),
        401: unauthorizedResponse(),
        403: forbiddenResponse("You do not have permission to access this order"),
        404: notFoundResponse("Order"),
      },
    },
  },
};

// ---- DOKÜMAN ----

export const openApiDocument: JsonSchema = {
  openapi: "3.1.0",
  info: {
    title: "LocalShop API",
    version: packageJson.version,
    description:
      "LocalShop, yerel üreticilerin ürünlerini doğrudan müşterilere sattığı marketplace MVP'sinin REST API'si. " +
      "Tüm başarılı response'lar `{ success: true, data, meta? }`, tüm hata response'ları " +
      "`{ success: false, error: { message, code, details? } }` zarfıyla döner.",
    contact: { name: "LocalShop", email: "support@localshop.dev" },
  },
  // İlk sırada göreli "/" bilinçli: Swagger UI "Try it out" isteklerini burada verilen
  // server URL'ine göre kurar (sayfanın yüklendiği yere göre DEĞİL). URL mutlak
  // "http://localhost:5000" olsaydı ve doküman sayfası farklı bir host adıyla açılsaydı
  // (ör. 127.0.0.1, bir VS Code port-forward adresi, bir LAN IP'si), sayfanın kendi
  // origin'i (CSP'deki connect-src 'self' buna göre çözülür) ile isteğin hedef origin'i
  // uyuşmaz ve tarayıcı isteği ağa hiç göndermeden CSP ihlali olarak engeller — istek
  // sunucuya asla ulaşmaz. Göreli "/" bu sınıf hatayı tamamen ortadan kaldırır: her
  // zaman dokümantasyon sayfasının kendi origin'ine göre çözülür. Mutlak URL, ham
  // openapi.json'ı Swagger UI dışında (Postman vb.) okuyanlar için referans amaçlı ikinci sırada tutulur.
  servers: [
    { url: "/", description: "Bu dokümantasyon sayfasıyla aynı origin (Try it out için önerilir)" },
    { url: "http://localhost:5000", description: "Local development (mutlak URL — harici araçlar için)" },
  ],
  tags: [
    { name: "Auth", description: "Kayıt, giriş ve mevcut kullanıcı" },
    { name: "Catalog", description: "Herkese açık ürün kataloğu (authenticate gerektirmez)" },
    { name: "Seller Products", description: "Satıcının kendi ürün yönetimi" },
    { name: "Cart", description: "Müşteri sepeti (yalnızca customer rolü)" },
    { name: "Orders", description: "Müşteri sipariş akışı (yalnızca customer rolü)" },
    { name: "Seller Orders", description: "Satıcıya gelen siparişler ve kargo yönetimi (yalnızca seller rolü)" },
    { name: "Payments", description: "FakePay ile ödeme (yalnızca customer rolü)" },
    { name: "System", description: "Sağlık kontrolü" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas,
  },
  paths,
};
