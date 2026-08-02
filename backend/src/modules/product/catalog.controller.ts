import type { Request, Response } from "express";

import * as catalogService from "@/modules/product/catalog.service";
import type { CatalogIdParam, CatalogQuery } from "@/modules/product/catalog.schemas";
import { sendSuccess } from "@/shared/apiResponse";
import { asyncHandler } from "@/shared/asyncHandler";
import { getParams, getQuery } from "@/shared/getValidated";

export const list = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const query = getQuery<CatalogQuery>(req);
  const { items, total, page, limit, totalPages } = await catalogService.listCatalog(query);
  sendSuccess(res, items, 200, { total, page, limit, totalPages });
});

export const getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = getParams<CatalogIdParam>(req);
  const product = await catalogService.getCatalogProductById(id);
  sendSuccess(res, product);
});

export const categories = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const result = await catalogService.getCategories();
  sendSuccess(res, result);
});
