/**
 * Operations Module
 * Autonomous operations management including inventory, orders, and fulfillment
 */

import { EventEmitter } from 'events';
import { InventoryService } from './services/inventory-service.js';
import { OrderService } from './services/order-service.js';
import { FulfillmentService } from './services/fulfillment-service.js';
import {
  OperationsConfig,
  OperationsMetrics,
  OperationsEvent,
  Product,
  Order,
  Warehouse,
  Supplier,
  InventoryItem,
  Fulfillment
} from './types.js';

export class OperationsModule extends EventEmitter {
  private inventory: InventoryService;
  private orders: OrderService;
  private fulfillment: FulfillmentService;
  private config: OperationsConfig;

  constructor(config?: Partial<OperationsConfig>) {
    super();
    
    // Default configuration
    this.config = {
      inventory: {
        enableAutoReorder: true,
        lowStockThreshold: 0.2, // 20% of reorder point
        safetyStockMultiplier: 1.5,
        inventoryCountFrequency: 30, // days
        ...config?.inventory
      },
      fulfillment: {
        autoAssignment: true,
        prioritization: 'priority',
        packingOptimization: true,
        multiWarehouse: true,
        ...config?.fulfillment
      },
      shipping: {
        carriers: ['UPS', 'FedEx', 'USPS', 'DHL'],
        defaultCarrier: 'UPS',
        rateOptimization: true,
        insuranceThreshold: 100,
        ...config?.shipping
      }
    };

    // Initialize services
    this.inventory = new InventoryService(this.config.inventory);
    this.orders = new OrderService(this.config);
    this.fulfillment = new FulfillmentService(this.config.fulfillment);

    this.setupServiceIntegration();
    this.initializeDefaultData();
  }

  /**
   * Setup inter-service communication
   */
  private setupServiceIntegration(): void {
    // Order -> Inventory integration
    this.orders.on('inventory-request', async (request) => {
      try {
        switch (request.type) {
          case 'reserve':
            const reservations = await this.inventory.reserveInventory(
              request.items[0].productId, // Simplified for single product
              request.items[0].quantity,
              request.orderId
            );
            
            // Create fulfillment requests based on reservations
            const warehouseAllocations = reservations.map(r => ({
              warehouseId: r.warehouseId,
              items: request.items.map(i => i.id)
            }));
            
            const fulfillments = await this.fulfillment.createFulfillment(
              request.orderId,
              request.items,
              'medium',
              warehouseAllocations
            );
            
            break;
            
          case 'release':
            for (const item of request.items) {
              await this.inventory.releaseInventory(
                item.productId,
                item.warehouseId,
                item.quantity,
                request.orderId
              );
            }
            break;
            
          case 'ship':
            for (const item of request.items) {
              await this.inventory.updateInventory(
                item.productId,
                item.warehouseId,
                -item.quantity,
                `Shipped for order ${request.orderId}`
              );
            }
            break;
        }
      } catch (error) {
        this.emit('error', {
          service: 'inventory',
          request,
          error: error.message
        });
      }
    });

    // Order -> Fulfillment integration
    this.orders.on('fulfillment-request', async (request) => {
      if (request.type === 'create') {
        // Determine warehouse allocations
        const allocations = await this.determineWarehouseAllocations(request.items);
        
        await this.fulfillment.createFulfillment(
          request.orderId,
          request.items,
          request.priority,
          allocations
        );
      }
    });

    // Fulfillment -> Order integration
    this.fulfillment.on('order-update', async (update) => {
      await this.orders.updateOrderStatus(update.orderId, update.status);
      
      if (update.trackingNumbers) {
        for (const trackingNumber of update.trackingNumbers) {
          await this.orders.addTrackingInfo(
            update.orderId,
            this.config.shipping.defaultCarrier,
            trackingNumber
          );
        }
      }
    });

    // Inventory alerts
    this.inventory.on('alert', (alert) => {
      this.emit('alert', {
        ...alert,
        source: 'inventory'
      });
    });

    // Order notifications
    this.orders.on('notification', (notification) => {
      this.emit('notification', {
        ...notification,
        source: 'orders'
      });
    });

    // Fulfillment tasks
    this.fulfillment.on('task', (task) => {
      this.emit('task', {
        ...task,
        source: 'fulfillment'
      });
    });

    // Forward all service events
    ['inventory', 'orders', 'fulfillment'].forEach(service => {
      this[service].on('event', (event) => {
        this.emit('event', {
          ...event,
          source: service
        });
      });
    });
  }

  /**
   * Initialize with sample data
   */
  private initializeDefaultData(): void {
    // Add sample warehouse
    const warehouse: Warehouse = {
      id: 'WH001',
      name: 'Main Distribution Center',
      address: {
        street: '123 Logistics Way',
        city: 'Dallas',
        state: 'TX',
        postalCode: '75001',
        country: 'USA'
      },
      capacity: 10000,
      currentUtilization: 0.6,
      zones: [
        { id: 'A', name: 'Electronics', type: 'storage', capacity: 2000, currentUtilization: 0.7 },
        { id: 'B', name: 'Apparel', type: 'storage', capacity: 3000, currentUtilization: 0.5 },
        { id: 'P', name: 'Picking', type: 'picking', capacity: 1000, currentUtilization: 0.4 },
        { id: 'S', name: 'Shipping', type: 'shipping', capacity: 500, currentUtilization: 0.3 }
      ],
      operatingHours: {
        monday: { open: '08:00', close: '18:00', closed: false },
        tuesday: { open: '08:00', close: '18:00', closed: false },
        wednesday: { open: '08:00', close: '18:00', closed: false },
        thursday: { open: '08:00', close: '18:00', closed: false },
        friday: { open: '08:00', close: '18:00', closed: false },
        saturday: { open: '09:00', close: '14:00', closed: false },
        sunday: { open: '00:00', close: '00:00', closed: true }
      },
      status: 'active'
    };
    
    this.inventory.addWarehouse(warehouse);

    // Add sample supplier
    const supplier: Supplier = {
      id: 'SUP001',
      name: 'Tech Supplies Inc',
      contact: {
        email: 'orders@techsupplies.com',
        phone: '+1-555-0123',
        name: 'John Smith'
      },
      products: [],
      leadTime: 5,
      minimumOrder: 100,
      paymentTerms: 'Net 30',
      rating: 4.5,
      status: 'active'
    };
    
    this.inventory.addSupplier(supplier);
  }

  /**
   * Process new order
   */
  async processOrder(orderData: {
    customerId: string;
    items: { productId: string; quantity: number; unitPrice: number }[];
    shippingAddress: any;
    billingAddress: any;
    paymentMethod: any;
    shippingMethod: string;
  }): Promise<Order> {
    // Check inventory availability first
    for (const item of orderData.items) {
      const available = await this.checkInventoryAvailability(item.productId, item.quantity);
      if (!available) {
        throw new Error(`Insufficient inventory for product ${item.productId}`);
      }
    }

    // Create order
    const order = await this.orders.createOrder(
      orderData.customerId,
      orderData.items,
      orderData.shippingAddress,
      orderData.billingAddress,
      orderData.paymentMethod,
      orderData.shippingMethod
    );

    return order;
  }

  /**
   * Add product to catalog
   */
  async addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const product: Product = {
      ...productData,
      id: this.generateProductId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return await this.inventory.addProduct(product);
  }

  /**
   * Check inventory availability
   */
  private async checkInventoryAvailability(productId: string, quantity: number): Promise<boolean> {
    // This would check across all warehouses
    // Simplified implementation
    return true;
  }

  /**
   * Determine warehouse allocations for order items
   */
  private async determineWarehouseAllocations(
    items: any[]
  ): Promise<{ warehouseId: string; items: string[] }[]> {
    // Simple allocation - all items from main warehouse
    // In reality, would optimize based on location, stock levels, etc.
    return [{
      warehouseId: 'WH001',
      items: items.map(item => item.id)
    }];
  }

  /**
   * Get comprehensive metrics
   */
  async getMetrics(): Promise<OperationsMetrics> {
    const orderMetrics = this.orders.getMetrics();
    const inventoryMetrics = this.inventory.getMetrics();
    const fulfillmentMetrics = this.fulfillment.getMetrics();

    // Calculate warehouse metrics
    const warehouseMetrics = {
      utilization: 0.65, // Would calculate from actual warehouse data
      activeZones: 4,
      staffEfficiency: 0.85
    };

    return {
      orders: orderMetrics,
      inventory: {
        ...inventoryMetrics,
        stockTurnover: this.calculateStockTurnover()
      },
      fulfillment: fulfillmentMetrics,
      warehouse: warehouseMetrics
    };
  }

  /**
   * Calculate stock turnover ratio
   */
  private calculateStockTurnover(): number {
    // Simplified calculation
    // In reality: Cost of Goods Sold / Average Inventory Value
    return 4.5; // 4.5 times per year
  }

  /**
   * Get module status
   */
  getStatus(): any {
    const metrics = this.orders.getMetrics();
    const inventoryMetrics = this.inventory.getMetrics();
    
    return {
      module: 'operations',
      status: 'operational',
      services: {
        inventory: {
          enabled: true,
          totalProducts: inventoryMetrics.totalProducts,
          lowStockAlerts: inventoryMetrics.lowStock,
          autoReorderEnabled: this.config.inventory.enableAutoReorder
        },
        orders: {
          enabled: true,
          activeOrders: metrics.processing + metrics.shipped,
          pendingOrders: metrics.pending,
          todayOrders: 0 // Would calculate from actual data
        },
        fulfillment: {
          enabled: true,
          autoAssignment: this.config.fulfillment.autoAssignment,
          packingOptimization: this.config.fulfillment.packingOptimization
        }
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Handle external order status check
   */
  async checkOrderStatus(orderId: string): Promise<any> {
    const order = this.orders.getOrder(orderId);
    if (!order) {
      return null;
    }

    const fulfillments = this.fulfillment.getOrderFulfillments(orderId);
    
    return {
      orderNumber: order.orderNumber,
      status: order.status,
      tracking: order.tracking,
      estimatedDelivery: order.shipping.estimatedDelivery,
      fulfillmentStatus: fulfillments.map(f => ({
        warehouseId: f.warehouseId,
        status: f.status
      }))
    };
  }

  /**
   * Search orders
   */
  searchOrders(query: string): Order[] {
    return this.orders.searchOrders(query);
  }

  /**
   * Get customer orders
   */
  getCustomerOrders(customerId: string): Order[] {
    return this.orders.getCustomerOrders(customerId);
  }

  /**
   * Helper methods
   */
  
  private generateProductId(): string {
    return `PROD_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Public service access
   */
  
  getInventoryService(): InventoryService {
    return this.inventory;
  }

  getOrderService(): OrderService {
    return this.orders;
  }

  getFulfillmentService(): FulfillmentService {
    return this.fulfillment;
  }
}

// Export types and main module
export * from './types.js';
export default OperationsModule;