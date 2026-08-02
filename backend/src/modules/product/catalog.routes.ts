import { Router } from "express";

import * as catalogController from "@/modules/product/catalog.controller";
import { catalogIdParamSchema, catalogQuerySchema } from "@/modules/product/catalog.schemas";
import { validate } from "@/middlewares/validate";

export const catalogRoutes = Router();

// Herkese açık katalog: authenticate uygulanmaz.

// /categories, /:id'den ÖNCE tanımlanmalı: aksi halde Express "/categories" isteğini
// /:id ile eşleştirir, id parametresi "categories" olur ve ObjectId validasyonundan 400 döner.
catalogRoutes.get("/categories", catalogController.categories);

catalogRoutes.get("/", validate({ query: catalogQuerySchema }), catalogController.list);

catalogRoutes.get(
  "/:id",
  validate({ params: catalogIdParamSchema }),
  catalogController.getById,
);
