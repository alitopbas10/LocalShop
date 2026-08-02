import type { Request, Response } from "express";

import * as cartService from "@/modules/cart/cart.service";
import type { AddItemInput, CartItemParam, UpdateItemInput } from "@/modules/cart/cart.schemas";
import { sendSuccess } from "@/shared/apiResponse";
import { asyncHandler } from "@/shared/asyncHandler";
import { getBody, getParams } from "@/shared/getValidated";

export const get = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cart = await cartService.getCart(req.user!.id);
  sendSuccess(res, cart);
});

export const addItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { productId, quantity } = getBody<AddItemInput>(req);
  const cart = await cartService.addItem(req.user!.id, productId, quantity);
  sendSuccess(res, cart);
});

export const updateItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { productId } = getParams<CartItemParam>(req);
  const { quantity } = getBody<UpdateItemInput>(req);
  const cart = await cartService.updateItemQuantity(req.user!.id, productId, quantity);
  sendSuccess(res, cart);
});

export const removeItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { productId } = getParams<CartItemParam>(req);
  const cart = await cartService.removeItem(req.user!.id, productId);
  sendSuccess(res, cart);
});

export const clear = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const cart = await cartService.clearCart(req.user!.id);
  sendSuccess(res, cart);
});
