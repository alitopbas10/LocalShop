import { Router } from "express";

import * as productController from "@/modules/product/product.controller";
import {
  createProductSchema,
  productIdParamSchema,
  sellerProductQuerySchema,
  updateProductSchema,
} from "@/modules/product/product.schemas";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { validate } from "@/middlewares/validate";

export const productRoutes = Router();

// Router genelinde uygulanır: tek tek route'a eklemeyi unutma riski kalmaz.
productRoutes.use(authenticate, authorize("seller"));

productRoutes.post("/", validate({ body: createProductSchema }), productController.create);

productRoutes.get(
  "/",
  validate({ query: sellerProductQuerySchema }),
  productController.listMine,
);

productRoutes.get(
  "/:id",
  validate({ params: productIdParamSchema }),
  productController.getMineById,
);

productRoutes.patch(
  "/:id",
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productController.update,
);

// DELETE soft delete için kullanılır: istemci açısından semantik doğru (kaynak artık
// listelenmiyor), sunucu tarafında veri (sepet/sipariş referansları için) korunuyor.
productRoutes.delete(
  "/:id",
  validate({ params: productIdParamSchema }),
  productController.deactivate,
);

productRoutes.patch(
  "/:id/activate",
  validate({ params: productIdParamSchema }),
  productController.activate,
);
