/**
 * Operations Module Types
 * Defines interfaces and types for autonomous operations management
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  weight?: number;
  dimensions?: ProductDimensions;
  images: string[];
  tags: string[];
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDimensions {
  length: number;
  width: number;
  height: number;
  unit: 'cm' | 'inch';
}

export type ProductStatus = 'active' | 'inactive' | 'discontinued' | 'out-of-stock';

export interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  reorderQuantity: number;
  location: string;
  lastRestocked?: Date;
  lastCounted?: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  address: Address;
  capacity: number;
  currentUtilization: number;
  zones: WarehouseZone[];
  operatingHours: OperatingHours;
  manager?: string;
  status: 'active' | 'inactive' | 'maintenance';
}

export interface WarehouseZone {
  id: string;
  name: string;
  type: 'storage' | 'picking' | 'packing' | 'shipping' | 'receiving';
  capacity: number;
  currentUtilization: number;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface OperatingHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface Order {
  id: string;
  customerId: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  payment: PaymentInfo;
  shipping: ShippingInfo;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  fulfilledAt?: Date;
  tracking?: TrackingInfo[];
}

export type OrderStatus = 
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
  fulfillmentStatus: 'pending' | 'allocated' | 'picked' | 'packed' | 'shipped';
  warehouseId?: string;
  trackingNumber?: string;
}

export interface PaymentInfo {
  method: 'credit_card' | 'debit_card' | 'paypal' | 'bank_transfer' | 'crypto';
  status: 'pending' | 'authorized' | 'captured' | 'failed' | 'refunded';
  transactionId?: string;
  amount: number;
  currency: string;
  processedAt?: Date;
}

export interface ShippingInfo {
  method: string;
  carrier: string;
  serviceLevel: 'standard' | 'express' | 'overnight' | 'economy';
  estimatedDelivery: Date;
  cost: number;
  insurance?: number;
  signature?: boolean;
}

export interface TrackingInfo {
  carrier: string;
  trackingNumber: string;
  status: string;
  lastUpdate: Date;
  estimatedDelivery?: Date;
  events: TrackingEvent[];
}

export interface TrackingEvent {
  timestamp: Date;
  location: string;
  status: string;
  description: string;
}

export interface Fulfillment {
  id: string;
  orderId: string;
  warehouseId: string;
  status: FulfillmentStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  pickedItems: PickedItem[];
  packingSlips: string[];
  shippingLabels: string[];
  startedAt?: Date;
  completedAt?: Date;
}

export type FulfillmentStatus = 
  | 'pending'
  | 'assigned'
  | 'picking'
  | 'packing'
  | 'ready-to-ship'
  | 'shipped'
  | 'completed';

export interface PickedItem {
  orderItemId: string;
  productId: string;
  quantity: number;
  location: string;
  pickedAt: Date;
  pickedBy?: string;
}

export interface SupplierOrder {
  id: string;
  supplierId: string;
  orderNumber: string;
  status: 'draft' | 'sent' | 'confirmed' | 'shipped' | 'received' | 'completed';
  items: SupplierOrderItem[];
  expectedDelivery: Date;
  total: number;
  currency: string;
  terms: string;
  createdAt: Date;
  receivedAt?: Date;
}

export interface SupplierOrderItem {
  productId: string;
  sku: string;
  quantity: number;
  unitCost: number;
  total: number;
}

export interface Supplier {
  id: string;
  name: string;
  contact: ContactInfo;
  products: string[]; // Product IDs
  leadTime: number; // in days
  minimumOrder: number;
  paymentTerms: string;
  rating: number;
  status: 'active' | 'inactive' | 'suspended';
}

export interface ContactInfo {
  email: string;
  phone: string;
  name?: string;
  address?: Address;
}

export interface OperationsEvent {
  id: string;
  timestamp: Date;
  eventType: OperationsEventType;
  entityId: string;
  entityType: 'order' | 'inventory' | 'fulfillment' | 'supplier';
  data: Record<string, any>;
  source: string;
}

export type OperationsEventType = 
  | 'order.created'
  | 'order.updated'
  | 'order.fulfilled'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled'
  | 'inventory.low'
  | 'inventory.updated'
  | 'inventory.counted'
  | 'fulfillment.started'
  | 'fulfillment.completed'
  | 'supplier.order.created'
  | 'supplier.order.received';

export interface OperationsConfig {
  inventory: {
    enableAutoReorder: boolean;
    lowStockThreshold: number;
    safetyStockMultiplier: number;
    inventoryCountFrequency: number; // days
  };
  fulfillment: {
    autoAssignment: boolean;
    prioritization: 'fifo' | 'priority' | 'value' | 'shipping-date';
    packingOptimization: boolean;
    multiWarehouse: boolean;
  };
  shipping: {
    carriers: string[];
    defaultCarrier: string;
    rateOptimization: boolean;
    insuranceThreshold: number;
  };
}

export interface OperationsMetrics {
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
    averageFulfillmentTime: number;
    onTimeDeliveryRate: number;
  };
  inventory: {
    totalProducts: number;
    totalValue: number;
    stockTurnover: number;
    outOfStock: number;
    lowStock: number;
    excessStock: number;
  };
  fulfillment: {
    ordersInProgress: number;
    averagePickingTime: number;
    averagePackingTime: number;
    errorRate: number;
    efficiency: number;
  };
  warehouse: {
    utilization: number;
    activeZones: number;
    staffEfficiency: number;
  };
}