import { Router } from "express";

import * as orderController from "@/modules/order/order.controller";
import {
  createOrderSchema,
  customerOrderQuerySchema,
  orderIdParamSchema,
} from "@/modules/order/order.schemas";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { validate } from "@/middlewares/validate";

export const orderRoutes = Router();

// Sipariş erişimi customer rolüne kısıtlıdır: seller kendi siparişlerini
// /api/seller/orders üzerinden ayrı bir router ile görür.
orderRoutes.use(authenticate, authorize("customer"));

orderRoutes.post("/", validate({ body: createOrderSchema }), orderController.create);

orderRoutes.get("/", validate({ query: customerOrderQuerySchema }), orderController.list);

orderRoutes.get("/:id", validate({ params: orderIdParamSchema }), orderController.getById);

orderRoutes.patch(
  "/:id/cancel",
  validate({ params: orderIdParamSchema }),
  orderController.cancel,
);
