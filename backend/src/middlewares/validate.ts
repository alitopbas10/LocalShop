import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

import { AppError } from "@/shared/AppError";

type ValidationSource = "body" | "query" | "params";

export type ValidationSchemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

type ValidationDetail = {
  source: ValidationSource;
  field: string;
  message: string;
};

const VALIDATION_SOURCES: ValidationSource[] = ["body", "query", "params"];

// Express 5'te req.query salt-okunur bir getter; valide edilmiş veriyi
// req.query/req.params üzerine yazmak yerine req.validated altında topluyoruz.
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const details: ValidationDetail[] = [];
    const validated: NonNullable<Request["validated"]> = { ...req.validated };

    for (const source of VALIDATION_SOURCES) {
      const schema = schemas[source];
      if (!schema) {
        continue;
      }

      const result = schema.safeParse(req[source]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          details.push({
            source,
            field: issue.path.map(String).join(".") || "root",
            message: issue.message,
          });
        }
        continue;
      }

      validated[source] = result.data;
    }

    if (details.length > 0) {
      next(AppError.validation("Request validation failed", details));
      return;
    }

    req.validated = validated;
    if (validated.body !== undefined) {
      req.body = validated.body;
    }

    next();
  };
}
