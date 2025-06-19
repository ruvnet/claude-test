/**
 * Autonomous Inventory Management Service
 * Handles stock levels, reordering, and warehouse management
 */

import { EventEmitter } from 'events';
import {
  Product,
  InventoryItem,
  Warehouse,
  SupplierOrder,
  SupplierOrderItem,
  Supplier,
  OperationsEvent,
  OperationsConfig
} from '../types.js';

export class InventoryService extends EventEmitter {
  private inventory: Map<string, InventoryItem> = new Map();
  private products: Map<string, Product> = new Map();
  private warehouses: Map<string, Warehouse> = new Map();
  private suppliers: Map<string, Supplier> = new Map();
  private supplierOrders: Map<string, SupplierOrder> = new Map();
  private config: OperationsConfig['inventory'];
  private reorderAnalyzer: ReorderAnalyzer;

  constructor(config: OperationsConfig['inventory']) {
    super();
    this.config = config;
    this.reorderAnalyzer = new ReorderAnalyzer();
    this.startInventoryMonitoring();
  }

  /**
   * Start automated inventory monitoring
   */
  private startInventoryMonitoring(): void {
    // Check inventory levels every hour
    setInterval(() => {
      this.checkInventoryLevels();
    }, 3600000); // 1 hour

    // Daily inventory count reminder
    setInterval(() => {
      this.scheduleInventoryCount();
    }, 86400000); // 24 hours
  }

  /**
   * Add product to catalog
   */
  async addProduct(product: Product): Promise<Product> {
    this.products.set(product.id, product);
    
    // Initialize inventory in all warehouses
    for (const warehouse of this.warehouses.values()) {
      await this.initializeInventory(product.id, warehouse.id);
    }

    this.emit('event', {
      eventType: 'product.added',
      entityId: product.id,
      entityType: 'product',
      data: { sku: product.sku, name: product.name },
      timestamp: new Date()
    });

    return product;
  }

  /**
   * Initialize inventory for a product in a warehouse
   */
  private async initializeInventory(
    productId: string,
    warehouseId: string,
    initialQuantity: number = 0
  ): Promise<InventoryItem> {
    const inventoryId = `${productId}_${warehouseId}`;
    
    const inventoryItem: InventoryItem = {
      id: inventoryId,
      productId,
      warehouseId,
      quantity: initialQuantity,
      reservedQuantity: 0,
      availableQuantity: initialQuantity,
      reorderPoint: 50, // Default, will be adjusted based on demand
      reorderQuantity: 100, // Default, will be optimized
      location: this.assignOptimalLocation(productId, warehouseId),
      lastCounted: new Date()
    };

    this.inventory.set(inventoryId, inventoryItem);
    return inventoryItem;
  }

  /**
   * Update inventory quantity
   */
  async updateInventory(
    productId: string,
    warehouseId: string,
    quantityChange: number,
    reason: string
  ): Promise<InventoryItem> {
    const inventoryId = `${productId}_${warehouseId}`;
    const item = this.inventory.get(inventoryId);
    
    if (!item) {
      throw new Error('Inventory item not found');
    }

    const previousQuantity = item.quantity;
    item.quantity += quantityChange;
    item.availableQuantity = item.quantity - item.reservedQuantity;

    this.emit('event', {
      eventType: 'inventory.updated',
      entityId: inventoryId,
      entityType: 'inventory',
      data: {
        productId,
        warehouseId,
        previousQuantity,
        newQuantity: item.quantity,
        change: quantityChange,
        reason
      },
      timestamp: new Date()
    });

    // Check if reorder is needed
    if (item.availableQuantity <= item.reorderPoint) {
      await this.triggerReorder(item);
    }

    return item;
  }

  /**
   * Reserve inventory for an order
   */
  async reserveInventory(
    productId: string,
    quantity: number,
    orderId: string
  ): Promise<{ warehouseId: string; reserved: number }[]> {
    const availableInventory = this.findAvailableInventory(productId, quantity);
    
    if (!availableInventory || availableInventory.length === 0) {
      throw new Error(`Insufficient inventory for product ${productId}`);
    }

    const reservations: { warehouseId: string; reserved: number }[] = [];
    let remainingQuantity = quantity;

    // Reserve from multiple warehouses if needed
    for (const { item, available } of availableInventory) {
      const toReserve = Math.min(remainingQuantity, available);
      
      item.reservedQuantity += toReserve;
      item.availableQuantity -= toReserve;
      
      reservations.push({
        warehouseId: item.warehouseId,
        reserved: toReserve
      });

      remainingQuantity -= toReserve;
      
      if (remainingQuantity === 0) break;
    }

    this.emit('event', {
      eventType: 'inventory.reserved',
      entityId: orderId,
      entityType: 'order',
      data: {
        productId,
        quantity,
        reservations
      },
      timestamp: new Date()
    });

    return reservations;
  }

  /**
   * Release reserved inventory
   */
  async releaseInventory(
    productId: string,
    warehouseId: string,
    quantity: number,
    orderId: string
  ): Promise<void> {
    const inventoryId = `${productId}_${warehouseId}`;
    const item = this.inventory.get(inventoryId);
    
    if (!item) {
      throw new Error('Inventory item not found');
    }

    item.reservedQuantity = Math.max(0, item.reservedQuantity - quantity);
    item.availableQuantity = item.quantity - item.reservedQuantity;

    this.emit('event', {
      eventType: 'inventory.released',
      entityId: orderId,
      entityType: 'order',
      data: {
        productId,
        warehouseId,
        quantity
      },
      timestamp: new Date()
    });
  }

  /**
   * Find available inventory across warehouses
   */
  private findAvailableInventory(
    productId: string,
    requiredQuantity: number
  ): { item: InventoryItem; available: number }[] {
    const availableItems: { item: InventoryItem; available: number }[] = [];
    
    for (const item of this.inventory.values()) {
      if (item.productId === productId && item.availableQuantity > 0) {
        availableItems.push({
          item,
          available: item.availableQuantity
        });
      }
    }

    // Sort by available quantity (descending) to minimize splits
    return availableItems.sort((a, b) => b.available - a.available);
  }

  /**
   * Check inventory levels and trigger alerts/reorders
   */
  private async checkInventoryLevels(): Promise<void> {
    const lowStockItems: InventoryItem[] = [];
    const outOfStockItems: InventoryItem[] = [];

    for (const item of this.inventory.values()) {
      if (item.availableQuantity === 0) {
        outOfStockItems.push(item);
      } else if (item.availableQuantity <= item.reorderPoint) {
        lowStockItems.push(item);
      }

      // Auto-reorder if enabled
      if (this.config.enableAutoReorder && item.availableQuantity <= item.reorderPoint) {
        await this.triggerReorder(item);
      }
    }

    if (lowStockItems.length > 0) {
      this.emit('alert', {
        type: 'low-stock',
        severity: 'medium',
        items: lowStockItems.map(item => ({
          productId: item.productId,
          warehouseId: item.warehouseId,
          available: item.availableQuantity,
          reorderPoint: item.reorderPoint
        })),
        timestamp: new Date()
      });
    }

    if (outOfStockItems.length > 0) {
      this.emit('alert', {
        type: 'out-of-stock',
        severity: 'high',
        items: outOfStockItems.map(item => ({
          productId: item.productId,
          warehouseId: item.warehouseId
        })),
        timestamp: new Date()
      });
    }
  }

  /**
   * Trigger automatic reorder
   */
  private async triggerReorder(item: InventoryItem): Promise<void> {
    const product = this.products.get(item.productId);
    if (!product) return;

    // Find best supplier
    const supplier = this.findBestSupplier(item.productId);
    if (!supplier) {
      this.emit('alert', {
        type: 'no-supplier',
        severity: 'high',
        productId: item.productId,
        timestamp: new Date()
      });
      return;
    }

    // Calculate optimal reorder quantity
    const reorderQuantity = await this.reorderAnalyzer.calculateOptimalQuantity(
      item,
      product,
      this.config.safetyStockMultiplier
    );

    // Create supplier order
    const order = await this.createSupplierOrder(
      supplier.id,
      [{
        productId: item.productId,
        quantity: reorderQuantity,
        unitCost: product.cost
      }]
    );

    this.emit('event', {
      eventType: 'inventory.reordered',
      entityId: item.id,
      entityType: 'inventory',
      data: {
        supplierOrderId: order.id,
        quantity: reorderQuantity,
        expectedDelivery: order.expectedDelivery
      },
      timestamp: new Date()
    });
  }

  /**
   * Create supplier order
   */
  async createSupplierOrder(
    supplierId: string,
    items: { productId: string; quantity: number; unitCost: number }[]
  ): Promise<SupplierOrder> {
    const supplier = this.suppliers.get(supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const orderId = this.generateSupplierOrderId();
    const orderItems: SupplierOrderItem[] = items.map(item => {
      const product = this.products.get(item.productId);
      return {
        productId: item.productId,
        sku: product?.sku || '',
        quantity: item.quantity,
        unitCost: item.unitCost,
        total: item.quantity * item.unitCost
      };
    });

    const total = orderItems.reduce((sum, item) => sum + item.total, 0);
    const expectedDelivery = new Date();
    expectedDelivery.setDate(expectedDelivery.getDate() + supplier.leadTime);

    const order: SupplierOrder = {
      id: orderId,
      supplierId,
      orderNumber: `PO-${Date.now()}`,
      status: 'draft',
      items: orderItems,
      expectedDelivery,
      total,
      currency: 'USD',
      terms: supplier.paymentTerms,
      createdAt: new Date()
    };

    this.supplierOrders.set(orderId, order);

    // Auto-send order
    setTimeout(() => {
      this.sendSupplierOrder(orderId);
    }, 1000);

    return order;
  }

  /**
   * Send supplier order
   */
  private async sendSupplierOrder(orderId: string): Promise<void> {
    const order = this.supplierOrders.get(orderId);
    if (!order) return;

    order.status = 'sent';

    this.emit('event', {
      eventType: 'supplier.order.sent',
      entityId: orderId,
      entityType: 'supplier',
      data: {
        supplierId: order.supplierId,
        total: order.total,
        itemCount: order.items.length
      },
      timestamp: new Date()
    });

    // Simulate supplier confirmation
    setTimeout(() => {
      order.status = 'confirmed';
    }, 3600000); // 1 hour
  }

  /**
   * Receive supplier shipment
   */
  async receiveShipment(supplierOrderId: string): Promise<void> {
    const order = this.supplierOrders.get(supplierOrderId);
    if (!order || order.status !== 'shipped') {
      throw new Error('Invalid supplier order for receiving');
    }

    // Update inventory for each item
    for (const item of order.items) {
      // Distribute across warehouses based on need
      const warehouses = this.determineReceivingWarehouses(item.productId, item.quantity);
      
      for (const { warehouseId, quantity } of warehouses) {
        await this.updateInventory(
          item.productId,
          warehouseId,
          quantity,
          `Received from supplier order ${order.orderNumber}`
        );
      }
    }

    order.status = 'received';
    order.receivedAt = new Date();

    this.emit('event', {
      eventType: 'supplier.order.received',
      entityId: supplierOrderId,
      entityType: 'supplier',
      data: {
        orderNumber: order.orderNumber,
        itemsReceived: order.items.length
      },
      timestamp: new Date()
    });
  }

  /**
   * Perform inventory count
   */
  async performInventoryCount(
    warehouseId: string,
    counts: { productId: string; actualQuantity: number }[]
  ): Promise<void> {
    const discrepancies: any[] = [];

    for (const count of counts) {
      const inventoryId = `${count.productId}_${warehouseId}`;
      const item = this.inventory.get(inventoryId);
      
      if (!item) continue;

      const difference = count.actualQuantity - item.quantity;
      
      if (difference !== 0) {
        discrepancies.push({
          productId: count.productId,
          expected: item.quantity,
          actual: count.actualQuantity,
          difference
        });

        // Update to actual count
        await this.updateInventory(
          count.productId,
          warehouseId,
          difference,
          'Inventory count adjustment'
        );
      }

      item.lastCounted = new Date();
    }

    if (discrepancies.length > 0) {
      this.emit('alert', {
        type: 'inventory-discrepancy',
        severity: 'medium',
        warehouseId,
        discrepancies,
        timestamp: new Date()
      });
    }

    this.emit('event', {
      eventType: 'inventory.counted',
      entityId: warehouseId,
      entityType: 'warehouse',
      data: {
        itemsCounted: counts.length,
        discrepanciesFound: discrepancies.length
      },
      timestamp: new Date()
    });
  }

  /**
   * Get inventory metrics
   */
  getMetrics(): any {
    const products = Array.from(this.products.values());
    const inventoryItems = Array.from(this.inventory.values());

    const totalValue = inventoryItems.reduce((sum, item) => {
      const product = this.products.get(item.productId);
      return sum + (item.quantity * (product?.cost || 0));
    }, 0);

    const outOfStock = inventoryItems.filter(item => item.availableQuantity === 0).length;
    const lowStock = inventoryItems.filter(
      item => item.availableQuantity > 0 && item.availableQuantity <= item.reorderPoint
    ).length;

    return {
      totalProducts: products.length,
      totalValue,
      totalItems: inventoryItems.length,
      outOfStock,
      lowStock,
      warehouses: this.warehouses.size,
      pendingOrders: Array.from(this.supplierOrders.values())
        .filter(order => ['sent', 'confirmed', 'shipped'].includes(order.status)).length
    };
  }

  /**
   * Helper methods
   */

  private findBestSupplier(productId: string): Supplier | null {
    let bestSupplier: Supplier | null = null;
    let bestScore = 0;

    for (const supplier of this.suppliers.values()) {
      if (supplier.products.includes(productId) && supplier.status === 'active') {
        // Score based on rating, lead time, and minimum order
        const score = supplier.rating * 10 - supplier.leadTime * 0.5 - supplier.minimumOrder * 0.01;
        
        if (score > bestScore) {
          bestScore = score;
          bestSupplier = supplier;
        }
      }
    }

    return bestSupplier;
  }

  private assignOptimalLocation(productId: string, warehouseId: string): string {
    // Simple location assignment - would be more complex in reality
    const product = this.products.get(productId);
    const category = product?.category || 'general';
    
    const locationMap: Record<string, string> = {
      'electronics': 'A1',
      'clothing': 'B1',
      'food': 'C1',
      'general': 'D1'
    };

    return `${locationMap[category] || 'D1'}-${Math.floor(Math.random() * 100)}`;
  }

  private determineReceivingWarehouses(
    productId: string,
    totalQuantity: number
  ): { warehouseId: string; quantity: number }[] {
    // Distribute based on current stock levels and warehouse capacity
    const distributions: { warehouseId: string; quantity: number }[] = [];
    const inventoryByProduct = Array.from(this.inventory.values())
      .filter(item => item.productId === productId)
      .sort((a, b) => a.availableQuantity - b.availableQuantity);

    let remainingQuantity = totalQuantity;

    for (const item of inventoryByProduct) {
      const warehouse = this.warehouses.get(item.warehouseId);
      if (!warehouse) continue;

      const warehouseNeed = Math.max(0, item.reorderPoint * 2 - item.quantity);
      const toDistribute = Math.min(warehouseNeed, remainingQuantity);

      if (toDistribute > 0) {
        distributions.push({
          warehouseId: item.warehouseId,
          quantity: toDistribute
        });
        remainingQuantity -= toDistribute;
      }

      if (remainingQuantity === 0) break;
    }

    // If there's remaining quantity, distribute evenly
    if (remainingQuantity > 0 && distributions.length > 0) {
      const perWarehouse = Math.floor(remainingQuantity / distributions.length);
      distributions.forEach(dist => {
        dist.quantity += perWarehouse;
      });
    }

    return distributions;
  }

  private scheduleInventoryCount(): void {
    const now = new Date();
    const itemsToCount: { warehouseId: string; items: string[] }[] = [];

    for (const item of this.inventory.values()) {
      if (item.lastCounted) {
        const daysSinceCount = (now.getTime() - item.lastCounted.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceCount >= this.config.inventoryCountFrequency) {
          const existing = itemsToCount.find(i => i.warehouseId === item.warehouseId);
          if (existing) {
            existing.items.push(item.productId);
          } else {
            itemsToCount.push({
              warehouseId: item.warehouseId,
              items: [item.productId]
            });
          }
        }
      }
    }

    if (itemsToCount.length > 0) {
      this.emit('task', {
        type: 'inventory-count',
        priority: 'medium',
        data: itemsToCount,
        timestamp: new Date()
      });
    }
  }

  private generateSupplierOrderId(): string {
    return `SO_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Add warehouse
   */
  addWarehouse(warehouse: Warehouse): void {
    this.warehouses.set(warehouse.id, warehouse);
    
    // Initialize inventory for all products in new warehouse
    for (const product of this.products.values()) {
      this.initializeInventory(product.id, warehouse.id);
    }
  }

  /**
   * Add supplier
   */
  addSupplier(supplier: Supplier): void {
    this.suppliers.set(supplier.id, supplier);
  }
}

/**
 * Reorder quantity analyzer
 */
class ReorderAnalyzer {
  async calculateOptimalQuantity(
    item: InventoryItem,
    product: Product,
    safetyStockMultiplier: number
  ): Promise<number> {
    // Simple EOQ (Economic Order Quantity) calculation
    // In reality, would use historical sales data, seasonality, etc.
    
    const annualDemand = item.reorderPoint * 12; // Rough estimate
    const orderingCost = 50; // Fixed cost per order
    const holdingCost = product.cost * 0.25; // 25% of product cost annually

    const eoq = Math.sqrt((2 * annualDemand * orderingCost) / holdingCost);
    const safetyStock = item.reorderPoint * safetyStockMultiplier;

    return Math.max(
      Math.round(eoq),
      item.reorderQuantity,
      safetyStock - item.quantity
    );
  }
}