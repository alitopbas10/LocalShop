import type { Request, Response } from "express";

import * as paymentService from "@/modules/payment/payment.service";
import type { OrderPaymentsParam, PayCardInput } from "@/modules/payment/payment.schemas";
import { sendSuccess } from "@/shared/apiResponse";
import { asyncHandler } from "@/shared/asyncHandler";
import { getBody, getParams } from "@/shared/getValidated";

export const pay = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const input = getBody<PayCardInput>(req);
  const idempotencyKey = req.get("Idempotency-Key") ?? undefined;

  const result = await paymentService.payOrder(req.user!.id, input, idempotencyKey);
  sendSuccess(res, result);
});

export const getOrderPayments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { orderId } = getParams<OrderPaymentsParam>(req);
  const payments = await paymentService.getOrderPayments(req.user!.id, orderId);
  sendSuccess(res, payments);
});
