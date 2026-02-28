import { Rol } from '@prisma/client';

// JWT payload stored in request.user after authentication
export interface JwtPayload {
  id: string;
  email: string;
  rol: Rol;
}

// Common pagination query parameters
export interface PaginationQuery {
  page?: string;
  limit?: string;
}

// Generic paginated response
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  totalPages: number;
}

// Fastify module augmentation for typed request.user
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}
