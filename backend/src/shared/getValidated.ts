import type { Request } from "express";

import { AppError } from "@/shared/AppError";

type ValidationSource = "body" | "query" | "params";

function readValidated<T>(req: Request, source: ValidationSource): T {
  const value = req.validated?.[source];
  if (value === undefined) {
    throw AppError.internal(`validate middleware not applied for this route (missing ${source})`);
  }
  return value as T;
}

export function getBody<T>(req: Request): T {
  return readValidated<T>(req, "body");
}

export function getQuery<T>(req: Request): T {
  return readValidated<T>(req, "query");
}

export function getParams<T>(req: Request): T {
  return readValidated<T>(req, "params");
}
