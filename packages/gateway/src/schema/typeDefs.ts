import { gql } from 'graphql-tag';

export const typeDefs = gql`
  # ─── Scalars & Enums ─────────────────────────────────────────────────────────

  enum OrderStatus {
    PENDING
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
  }

  # ─── Types ───────────────────────────────────────────────────────────────────

  type User {
    id: ID!
    name: String!
    email: String!
    phone: String
    address: String
    createdAt: String!
    updatedAt: String!
    """
    All orders placed by this user — resolved from the Order Service.
    """
    orders: [Order!]!
  }

  type Order {
    id: ID!
    userId: ID!
    productId: ID!
    quantity: Int!
    totalPrice: Float!
    status: OrderStatus!
    createdAt: String!
    updatedAt: String!
    """
    The product associated with this order — resolved from the Product Service.
    Uses DataLoader for efficient batched fetching.
    """
    product: Product!
  }

  type Product {
    id: ID!
    name: String!
    description: String!
    price: Float!
    category: String!
    inStock: Boolean!
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  # ─── Queries ─────────────────────────────────────────────────────────────────

  type Query {
    """
    Fetch a single user by ID, including their orders and order products.
    """
    user(id: ID!): User

    """
    Fetch all users.
    """
    users: [User!]!

    """
    Fetch a single product by ID.
    """
    product(id: ID!): Product

    """
    Fetch all products in the catalog.
    """
    products: [Product!]!

    """
    Fetch orders for a specific user by user ID.
    """
    ordersByUser(userId: ID!): [Order!]!
  }
`;
