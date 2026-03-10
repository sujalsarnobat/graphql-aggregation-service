import { Router } from 'express';
import { getProduct, getProducts } from '../controllers/product.controller.js';

export const productRouter = Router();

productRouter.get('/', getProducts);
productRouter.get('/:id', getProduct);
