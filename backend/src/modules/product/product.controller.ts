import type { Request, Response } from "express";

import * as productService from "@/modules/product/product.service";
import type {
  CreateProductInput,
  ProductIdParam,
  SellerProductQuery,
  UpdateProductInput,
} from "@/modules/product/product.schemas";
import { sendCreated, sendSuccess } from "@/shared/apiResponse";
import { asyncHandler } from "@/shared/asyncHandler";
import { getBody, getParams, getQuery } from "@/shared/getValidated";

export const create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const body = getBody<CreateProductInput>(req);
  const product = await productService.createProduct(req.user!.id, body);
  sendCreated(res, product);
});

export const listMine = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = getQuery<SellerProductQuery>(req);
  const { items, total, page, limit, totalPages } = await productService.getSellerProducts(
    req.user!.id,
    query,
  );
  sendSuccess(res, items, 200, { total, page, limit, totalPages });
});

export const getMineById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<ProductIdParam>(req);
  const product = await productService.getSellerProductById(req.user!.id, id);
  sendSuccess(res, product);
});

export const update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<ProductIdParam>(req);
  const body = getBody<UpdateProductInput>(req);
  const product = await productService.updateProduct(req.user!.id, id, body);
  sendSuccess(res, product);
});

export const deactivate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<ProductIdParam>(req);
  const product = await productService.deactivateProduct(req.user!.id, id);
  sendSuccess(res, product);
});

export const activate = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<ProductIdParam>(req);
  const product = await productService.activateProduct(req.user!.id, id);
  sendSuccess(res, product);
});
