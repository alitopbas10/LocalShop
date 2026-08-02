import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGO_URI: z.string().min(1),
  // Virgülle ayrılmış çoklu origin desteklenir (ör. "http://localhost:5173,https://app.example.com").
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173")
    .transform((val) =>
      val
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1d"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(14).default(12),
  AUTH_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  GLOBAL_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(15),
  GLOBAL_RATE_LIMIT_MAX: z.coerce.number().default(300),
  REQUEST_BODY_LIMIT: z.string().default("10kb"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

export const isDev = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";
export const isProd = env.NODE_ENV === "production";
