import { Router } from "express";

import * as orderController from "@/modules/order/order.controller";
import {
  orderIdParamSchema,
  sellerOrderQuerySchema,
  updateFulfillmentSchema,
} from "@/modules/order/order.schemas";
import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { validate } from "@/middlewares/validate";

export const sellerOrderRoutes = Router();

sellerOrderRoutes.use(authenticate, authorize("seller"));

sellerOrderRoutes.get(
  "/",
  validate({ query: sellerOrderQuerySchema }),
  orderController.listIncoming,
);

sellerOrderRoutes.get(
  "/:id",
  validate({ params: orderIdParamSchema }),
  orderController.getIncomingById,
);

sellerOrderRoutes.patch(
  "/:id/fulfillment",
  validate({ params: orderIdParamSchema, body: updateFulfillmentSchema }),
  orderController.updateFulfillment,
);
