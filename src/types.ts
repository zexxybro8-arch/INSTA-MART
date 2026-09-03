export type UserRole = 'user' | 'admin';

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  username: string;
  name: string;
  mobile: string;
  role: UserRole;
  currency: CurrencyCode;
  balance: number; // Stored in INR base units or current currency
  isBlocked: boolean;
  totalOrders: number;
  totalSpent: number;
  totalDeposits: number;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string; // Lucide icon name or image URL
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Service {
  id: string;
  subcategoryId: string;
  categoryId: string;
  name: string;
  description: string;
  icon: string;
  pricePer1000: number; // In INR
  minimumQuantity: number;
  maximumQuantity: number;
  speed: string;
  startTime: string;
  refill: string;
  guarantee: string;
  notes: string;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export type OrderStatus =
  | 'Pending'
  | 'Processing'
  | 'In Progress'
  | 'Completed'
  | 'Partial'
  | 'Cancelled'
  | 'Refunded';

export interface Order {
  id: string;
  orderId: string; // e.g., 'IM100245'
  userId: string;
  username: string;
  userEmail: string;
  categoryId: string;
  categoryName: string;
  subcategoryId: string;
  subcategoryName: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  currency: CurrencyCode;
  link: string;
  quantity: number;
  startCount: number;
  currentCount: number;
  remains: number;
  totalAmount: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  adminNote?: string;
  customerNote?: string;
  manuallyCreatedByAdmin?: boolean;
}

export type TransactionType =
  | 'Deposit'
  | 'Order Payment'
  | 'Refund'
  | 'Admin Credit'
  | 'Admin Debit';

export interface Transaction {
  id: string;
  userId: string;
  username: string;
  orderId?: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  balanceBefore: number;
  balanceAfter: number;
  status: 'Completed' | 'Pending' | 'Failed';
  description: string;
  admin?: string;
  createdAt: number;
}

export type DepositStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Deposit {
  id: string;
  depositId: string;
  userId: string;
  username: string;
  userEmail: string;
  amount: number;
  currency: CurrencyCode;
  paymentMethod: string;
  referenceId: string;
  screenshotUrl?: string;
  notes?: string;
  status: DepositStatus;
  adminNote?: string;
  approvedBy?: string;
  createdAt: number;
  updatedAt: number;
}

export type DepositRequest = Deposit;

export type TicketStatus = 'Open' | 'Pending' | 'Answered' | 'Closed';

export interface Ticket {
  id: string;
  ticketId: string;
  userId: string;
  username: string;
  userEmail: string;
  subject: string;
  orderId?: string;
  status: TicketStatus;
  priority: 'Low' | 'Medium' | 'High';
  lastMessageAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  createdAt: number;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  tagline: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  welcomeMessage: string;
  mainHeading: string;
  description: string;
  buttonText: string;
  announcement: string;
  whatsappNumber: string;
  supportEmail: string;
  termsOfService: string;
  privacyPolicy: string;
  defaultCurrency: CurrencyCode;
  exchangeRates: Record<CurrencyCode, number>; // Relative to INR (INR = 1)
  currencySymbols: Record<CurrencyCode, string>;
  upiId?: string;
  qrCodeUrl?: string;
  bankDetails?: string;
}

export interface MenuItemConfig {
  id: string;
  name: string;
  icon: string;
  page: string;
  description: string;
  isEnabled: boolean;
  sortOrder: number;
}

export interface ActivityLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  description: string;
  timestamp: number;
}
