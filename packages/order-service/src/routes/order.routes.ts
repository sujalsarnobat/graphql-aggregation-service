import { Router } from 'express';
import { getUserOrders, getOrder } from '../controllers/order.controller.js';

export const orderRouter = Router();

orderRouter.get('/user/:id', getUserOrders);
orderRouter.get('/:id', getOrder);
