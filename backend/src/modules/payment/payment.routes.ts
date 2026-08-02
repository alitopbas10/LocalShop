import { Router } from "express";

import { authenticate } from "@/middlewares/authenticate";
import { authorize } from "@/middlewares/authorize";
import { paymentRateLimit } from "@/middlewares/paymentRateLimit";
import { validate } from "@/middlewares/validate";
import * as paymentController from "@/modules/payment/payment.controller";
import { orderPaymentsParamSchema, payCardSchema } from "@/modules/payment/payment.schemas";

export const paymentRoutes = Router();

// Ödeme erişimi customer rolüne kısıtlıdır: satıcı ödeme akışıyla ilgilenmez.
paymentRoutes.use(authenticate, authorize("customer"));

paymentRoutes.post(
  "/pay",
  paymentRateLimit,
  validate({ body: payCardSchema }),
  paymentController.pay,
);

paymentRoutes.get(
  "/order/:orderId",
  validate({ params: orderPaymentsParamSchema }),
  paymentController.getOrderPayments,
);
