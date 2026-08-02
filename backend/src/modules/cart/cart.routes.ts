import { Router } from "express";

import * as cartController from "@/modules/cart/cart.controller";
import { addItemSchema, cartItemParamSchema, updateItemSchema } from "@/modules/cart/cart.schemas";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { validate } from "@/middlewares/validate";

export const cartRoutes = Router();

// Sepet yalnızca customer rolüne açıktır. Bu MVP'de roller birbirini dışlar: seller
// envanter yönetir, alışveriş yapmaz — seller'ın sepeti hiç olmayacağı için bu route'a
// erişimi de gerekmiyor.
cartRoutes.use(authenticate, authorize("customer"));

cartRoutes.get("/", cartController.get);

cartRoutes.post("/items", validate({ body: addItemSchema }), cartController.addItem);

cartRoutes.patch(
  "/items/:productId",
  validate({ params: cartItemParamSchema, body: updateItemSchema }),
  cartController.updateItem,
);

cartRoutes.delete(
  "/items/:productId",
  validate({ params: cartItemParamSchema }),
  cartController.removeItem,
);

cartRoutes.delete("/", cartController.clear);
