import { Request, Response, NextFunction } from 'express';
import { getUserById, getAllUsers } from '../services/user.service.js';
import { isAppError } from '@gas/shared';

export async function getUser(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getUserById(req.params['id'] as string);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function getUsers(_req: Request, res: Response, next: NextFunction) {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}
