import { sign, verify, type SignOptions } from "jsonwebtoken";

import { env } from "@/config/env";
import { AppError } from "@/shared/AppError";
import { USER_ROLES, type UserRole } from "@/modules/auth/user.types";

const ISSUER = "localshop-api";

export interface JwtPayload {
  sub: string;
  role: UserRole;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export function signAccessToken(payload: JwtPayload): string {
  return sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
    algorithm: "HS256",
    issuer: ISSUER,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  // algorithms kısıtlanmazsa token'ın kendi header'ındaki alg değerine güvenilir;
  // saldırgan alg'i "none" yapıp imzasız token gönderebilir (algorithm confusion saldırısı)
  const decoded: unknown = verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: ISSUER,
  });

  if (typeof decoded !== "object" || decoded === null) {
    throw AppError.unauthorized("Invalid token payload");
  }

  const { sub, role } = decoded as Record<string, unknown>;

  if (typeof sub !== "string" || !isUserRole(role)) {
    throw AppError.unauthorized("Invalid token payload");
  }

  return { sub, role };
}

export function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const parts = header.split(" ");

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}
