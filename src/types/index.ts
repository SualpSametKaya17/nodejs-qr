export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>;

export type AuthSession = {
  id: number;         // restaurantId (hem restoran sahibi hem staff için)
  email: string;
  name: string;
  slug: string;
  planId: number;
  role: string;       // "restaurant" | "superadmin" | "staff"
  staffRole?: string; // "ADMIN" | "MANAGER" | "WAITER" | "KITCHEN" (role==="staff" ise)
  staffId?: number;   // staff kaydının kendi ID'si
};

export type CustomerSession = {
  id: number;
  phone: string;
  name: string | null;
  restaurantId: number;
  role: "customer";
};
