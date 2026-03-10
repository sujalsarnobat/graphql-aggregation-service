import { Request, Response, NextFunction } from 'express';
import { getProductById, getAllProducts } from '../services/product.service.js';
import { isAppError } from '@gas/shared';

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await getProductById(req.params['id'] as string);
    res.json(product);
  } catch (err) {
    next(err);
  }
}

export async function getProducts(_req: Request, res: Response, next: NextFunction) {
  try {
    const products = await getAllProducts();
    res.json(products);
  } catch (err) {
    next(err);
  }
}
