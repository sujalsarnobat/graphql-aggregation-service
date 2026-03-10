import { Router } from 'express';
import { getUser, getUsers } from '../controllers/user.controller.js';

export const userRouter = Router();

userRouter.get('/', getUsers);
userRouter.get('/:id', getUser);
