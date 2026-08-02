import type { Request, Response } from "express";

import * as orderService from "@/modules/order/order.service";
import type {
  CustomerOrderQuery,
  OrderIdParam,
  SellerOrderQuery,
  UpdateFulfillmentInput,
} from "@/modules/order/order.schemas";
import { sendCreated, sendSuccess } from "@/shared/apiResponse";
import { asyncHandler } from "@/shared/asyncHandler";
import { getBody, getParams, getQuery } from "@/shared/getValidated";

// ---- MÜŞTERİ ----

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const order = await orderService.createOrder(req.user!.id);
  sendCreated(res, order);
});

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = getQuery<CustomerOrderQuery>(req);
  const { items, total, page, limit, totalPages } = await orderService.getCustomerOrders(
    req.user!.id,
    query,
  );
  sendSuccess(res, items, 200, { total, page, limit, totalPages });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<OrderIdParam>(req);
  const order = await orderService.getCustomerOrderById(req.user!.id, id);
  sendSuccess(res, orderService.toOrderView(order));
});

export const cancel = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<OrderIdParam>(req);
  const order = await orderService.cancelOrder(req.user!.id, id);
  sendSuccess(res, orderService.toOrderView(order));
});

// ---- SATICI ----

export const listIncoming = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = getQuery<SellerOrderQuery>(req);
  const { items, total, page, limit, totalPages } = await orderService.getSellerOrders(
    req.user!.id,
    query,
  );
  sendSuccess(res, items, 200, { total, page, limit, totalPages });
});

export const getIncomingById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<OrderIdParam>(req);
  const order = await orderService.getSellerOrderById(req.user!.id, id);
  sendSuccess(res, orderService.toSellerOrderView(order, req.user!.id));
});

export const updateFulfillment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<OrderIdParam>(req);
  const { status } = getBody<UpdateFulfillmentInput>(req);
  const order = await orderService.updateFulfillmentStatus(req.user!.id, id, status);
  sendSuccess(res, orderService.toSellerOrderView(order, req.user!.id));
});
