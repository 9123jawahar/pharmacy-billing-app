export type Role = "ADMIN" | "PHARMACIST" | "BILLING_CLERK";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  meta?: PaginationMeta;
}

export interface ApiItemResponse<T> {
  success: boolean;
  data: T;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  composition?: string | null;
  symptoms: string[];
  manufacturer?: string | null;
  category?: string | null;
  batchNumber: string;
  supplierId: string;
  supplier?: Supplier;
  stockQuantity: number;
  reorderLevel: number;
  costPrice: string;
  sellingPrice: string;
  gstPercent: string;
  expiryDate: string;
  rackLocation?: string | null;
  requiresRx: boolean;
  isActive: boolean;
  substitutes?: Drug[];
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  age?: number | null;
  gender?: string | null;
  address?: string | null;
  chronicConditions: string[];
  allergies: string[];
  loyaltyPoints: number;
  isActive: boolean;
  createdAt: string;
  _count?: { orders: number; subscriptions: number };
}

export interface Subscription {
  id: string;
  customerId: string;
  customer?: Customer;
  drugId: string;
  drug?: Pick<Drug, "id" | "name" | "genericName" | "stockQuantity">;
  quantity: number;
  frequencyDays: number;
  lastRefillDate?: string | null;
  nextDueDate: string;
  status: "ACTIVE" | "PAUSED" | "CANCELLED";
  notes?: string | null;
}

export interface Doctor {
  id: string;
  name: string;
  speciality: string;
  clinicAddress?: string | null;
  contactNumber: string;
  email?: string | null;
  isActive: boolean;
  _count?: { orders: number };
}

export interface Coupon {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FLAT";
  value: string;
  minOrderValue?: string | null;
  maxDiscount?: string | null;
  validFrom: string;
  validTo: string;
  usageLimit?: number | null;
  timesUsed: number;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  drugId: string;
  drug?: Pick<Drug, "id" | "name" | "genericName" | "batchNumber">;
  quantity: number;
  unitPrice: string;
  gstPercent: string;
  lineTotal: string;
}

export interface Order {
  id: string;
  invoiceNumber: string;
  customerId?: string | null;
  customer?: Customer | null;
  doctorId?: string | null;
  referredByDoctor?: Doctor | null;
  userId: string;
  createdByUser?: { id: string; name: string; role: Role };
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  loyaltyPointsUsed: number;
  loyaltyDiscount: string;
  couponId?: string | null;
  coupon?: Coupon | null;
  netTotal: string;
  paymentMethod: "CASH" | "CARD" | "UPI" | "WALLET" | "INSURANCE";
  status: "DRAFT" | "FINALIZED" | "VOIDED" | "REFUNDED";
  items: OrderItem[];
  notifications?: Array<{ id: string; channel: string; recipient: string; status: string; invoiceUrl?: string | null }>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  user?: { id: string; name: string; role: Role; email: string } | null;
  action: string;
  entity: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardSummary {
  todaysSales: number;
  monthlySales: number;
  todaysOrderCount: number;
  totalCustomers: number;
  lowStockCount: number;
  expiredCount: number;
  expiringSoonCount: number;
  dueSubscriptions: Subscription[];
  recentOrders: Order[];
}
