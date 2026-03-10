export interface UserDTO {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatusDTO =
  | 'PENDING'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export interface OrderDTO {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatusDTO;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDTO {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inStock: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
