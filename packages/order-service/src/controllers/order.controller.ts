import { Request, Response, NextFunction } from 'express';
import { getOrdersByUserId, getOrderById } from '../services/order.service.js';

export async function getUserOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const orders = await getOrdersByUserId(req.params['id'] as string);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const order = await getOrderById(req.params['id'] as string);
    if (!order) {
      res.status(404).json({ error: `Order '${req.params['id']}' not found` });
      return;
    }
    res.json(order);
  } catch (err) {
    next(err);
  }
}
