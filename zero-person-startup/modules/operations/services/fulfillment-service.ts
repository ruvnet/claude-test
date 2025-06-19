/**
 * Autonomous Fulfillment Service
 * Manages order fulfillment, picking, packing, and shipping
 */

import { EventEmitter } from 'events';
import {
  Fulfillment,
  FulfillmentStatus,
  Order,
  OrderItem,
  PickedItem,
  Warehouse,
  InventoryItem,
  ShippingInfo,
  OperationsConfig
} from '../types.js';

export class FulfillmentService extends EventEmitter {
  private fulfillments: Map<string, Fulfillment> = new Map();
  private config: OperationsConfig['fulfillment'];
  private workloadBalancer: WorkloadBalancer;
  private packingOptimizer: PackingOptimizer;
  private routeOptimizer: RouteOptimizer;

  constructor(config: OperationsConfig['fulfillment']) {
    super();
    this.config = config;
    this.workloadBalancer = new WorkloadBalancer();
    this.packingOptimizer = new PackingOptimizer();
    this.routeOptimizer = new RouteOptimizer();
  }

  /**
   * Create fulfillment for order
   */
  async createFulfillment(
    orderId: string,
    items: OrderItem[],
    priority: Fulfillment['priority'],
    warehouseAllocations: { warehouseId: string; items: string[] }[]
  ): Promise<Fulfillment[]> {
    const fulfillments: Fulfillment[] = [];

    // Create fulfillment for each warehouse
    for (const allocation of warehouseAllocations) {
      const fulfillmentId = this.generateFulfillmentId();
      const allocatedItems = items.filter(item => allocation.items.includes(item.id));

      const fulfillment: Fulfillment = {
        id: fulfillmentId,
        orderId,
        warehouseId: allocation.warehouseId,
        status: 'pending',
        priority,
        pickedItems: [],
        packingSlips: [],
        shippingLabels: []
      };

      this.fulfillments.set(fulfillmentId, fulfillment);
      fulfillments.push(fulfillment);

      // Auto-assign if enabled
      if (this.config.autoAssignment) {
        await this.assignFulfillment(fulfillment);
      }

      this.emit('event', {
        eventType: 'fulfillment.created',
        entityId: fulfillmentId,
        entityType: 'fulfillment',
        data: {
          orderId,
          warehouseId: allocation.warehouseId,
          itemCount: allocatedItems.length,
          priority
        },
        timestamp: new Date()
      });
    }

    return fulfillments;
  }

  /**
   * Assign fulfillment to worker
   */
  private async assignFulfillment(fulfillment: Fulfillment): Promise<void> {
    // Find best available worker based on workload and location
    const worker = await this.workloadBalancer.findBestWorker(
      fulfillment.warehouseId,
      fulfillment.priority
    );

    if (worker) {
      fulfillment.assignedTo = worker.id;
      fulfillment.status = 'assigned';
      fulfillment.startedAt = new Date();

      this.emit('task', {
        type: 'fulfillment-assigned',
        workerId: worker.id,
        fulfillmentId: fulfillment.id,
        priority: fulfillment.priority,
        timestamp: new Date()
      });

      // Start automated fulfillment process
      this.startAutomatedFulfillment(fulfillment);
    } else {
      // Queue for next available worker
      this.emit('alert', {
        type: 'no-worker-available',
        severity: 'medium',
        fulfillmentId: fulfillment.id,
        warehouseId: fulfillment.warehouseId,
        timestamp: new Date()
      });
    }
  }

  /**
   * Start automated fulfillment process
   */
  private async startAutomatedFulfillment(fulfillment: Fulfillment): Promise<void> {
    try {
      // Step 1: Picking
      await this.performPicking(fulfillment);
      
      // Step 2: Packing
      await this.performPacking(fulfillment);
      
      // Step 3: Shipping preparation
      await this.prepareShipping(fulfillment);
      
      // Mark as completed
      fulfillment.status = 'completed';
      fulfillment.completedAt = new Date();

      this.emit('event', {
        eventType: 'fulfillment.completed',
        entityId: fulfillment.id,
        entityType: 'fulfillment',
        data: {
          orderId: fulfillment.orderId,
          completionTime: fulfillment.completedAt.getTime() - (fulfillment.startedAt?.getTime() || 0)
        },
        timestamp: new Date()
      });

      // Update order status
      this.emit('order-update', {
        orderId: fulfillment.orderId,
        status: 'ready-to-ship',
        fulfillmentId: fulfillment.id
      });

    } catch (error) {
      fulfillment.status = 'pending';
      fulfillment.assignedTo = undefined;
      
      this.emit('error', {
        type: 'fulfillment-failed',
        fulfillmentId: fulfillment.id,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  /**
   * Perform picking process
   */
  private async performPicking(fulfillment: Fulfillment): Promise<void> {
    fulfillment.status = 'picking';

    // Get order items for this fulfillment
    const orderItems = await this.getOrderItems(fulfillment.orderId, fulfillment.warehouseId);
    
    // Generate optimized picking route
    const pickingRoute = await this.routeOptimizer.generatePickingRoute(
      orderItems,
      fulfillment.warehouseId
    );

    // Simulate picking each item
    for (const routeStop of pickingRoute) {
      const pickedItem: PickedItem = {
        orderItemId: routeStop.itemId,
        productId: routeStop.productId,
        quantity: routeStop.quantity,
        location: routeStop.location,
        pickedAt: new Date(),
        pickedBy: fulfillment.assignedTo
      };

      fulfillment.pickedItems.push(pickedItem);

      // Update inventory
      this.emit('inventory-update', {
        type: 'pick',
        productId: routeStop.productId,
        warehouseId: fulfillment.warehouseId,
        quantity: routeStop.quantity,
        location: routeStop.location
      });

      // Simulate picking time
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds per item
    }

    // Verify all items picked
    const allItemsPicked = orderItems.every(item =>
      fulfillment.pickedItems.some(picked => picked.orderItemId === item.id)
    );

    if (!allItemsPicked) {
      throw new Error('Not all items could be picked');
    }
  }

  /**
   * Perform packing process
   */
  private async performPacking(fulfillment: Fulfillment): Promise<void> {
    fulfillment.status = 'packing';

    // Optimize packing if enabled
    if (this.config.packingOptimization) {
      const packingPlan = await this.packingOptimizer.optimizePacking(
        fulfillment.pickedItems,
        fulfillment.orderId
      );

      // Generate packing slips for each box
      for (const box of packingPlan.boxes) {
        const packingSlip = await this.generatePackingSlip(
          fulfillment,
          box.items,
          box.boxType
        );
        fulfillment.packingSlips.push(packingSlip);
      }
    } else {
      // Simple single-box packing
      const packingSlip = await this.generatePackingSlip(
        fulfillment,
        fulfillment.pickedItems,
        'standard'
      );
      fulfillment.packingSlips.push(packingSlip);
    }

    // Simulate packing time
    await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds per fulfillment
  }

  /**
   * Prepare shipping
   */
  private async prepareShipping(fulfillment: Fulfillment): Promise<void> {
    fulfillment.status = 'ready-to-ship';

    // Generate shipping labels for each package
    for (let i = 0; i < fulfillment.packingSlips.length; i++) {
      const shippingLabel = await this.generateShippingLabel(
        fulfillment,
        fulfillment.packingSlips[i]
      );
      fulfillment.shippingLabels.push(shippingLabel);

      // Request carrier pickup
      this.emit('shipping-request', {
        type: 'schedule-pickup',
        fulfillmentId: fulfillment.id,
        warehouseId: fulfillment.warehouseId,
        packageCount: fulfillment.packingSlips.length,
        carrier: 'default'
      });
    }
  }

  /**
   * Update fulfillment status
   */
  async updateFulfillmentStatus(
    fulfillmentId: string,
    status: FulfillmentStatus
  ): Promise<Fulfillment> {
    const fulfillment = this.fulfillments.get(fulfillmentId);
    if (!fulfillment) {
      throw new Error('Fulfillment not found');
    }

    const previousStatus = fulfillment.status;
    fulfillment.status = status;

    if (status === 'shipped') {
      fulfillment.completedAt = new Date();
      
      // Update order
      this.emit('order-update', {
        orderId: fulfillment.orderId,
        status: 'shipped',
        trackingNumbers: fulfillment.shippingLabels
      });
    }

    this.emit('event', {
      eventType: 'fulfillment.updated',
      entityId: fulfillmentId,
      entityType: 'fulfillment',
      data: {
        previousStatus,
        newStatus: status
      },
      timestamp: new Date()
    });

    return fulfillment;
  }

  /**
   * Get fulfillment metrics
   */
  getMetrics(): any {
    const fulfillments = Array.from(this.fulfillments.values());
    const completed = fulfillments.filter(f => f.status === 'completed');
    
    const totalPickingTime = completed.reduce((sum, f) => {
      if (f.startedAt && f.pickedItems.length > 0) {
        const firstPick = Math.min(...f.pickedItems.map(p => p.pickedAt.getTime()));
        const lastPick = Math.max(...f.pickedItems.map(p => p.pickedAt.getTime()));
        return sum + (lastPick - firstPick);
      }
      return sum;
    }, 0);

    const totalPackingTime = completed.reduce((sum, f) => {
      if (f.completedAt && f.startedAt) {
        return sum + (f.completedAt.getTime() - f.startedAt.getTime());
      }
      return sum;
    }, 0);

    const errorCount = fulfillments.filter(f => f.status === 'pending' && f.startedAt).length;

    return {
      ordersInProgress: fulfillments.filter(f => 
        ['assigned', 'picking', 'packing'].includes(f.status)
      ).length,
      averagePickingTime: completed.length > 0 
        ? totalPickingTime / completed.length / 60000 // in minutes
        : 0,
      averagePackingTime: completed.length > 0
        ? totalPackingTime / completed.length / 60000 // in minutes
        : 0,
      errorRate: fulfillments.length > 0
        ? errorCount / fulfillments.length
        : 0,
      efficiency: this.calculateEfficiency(fulfillments),
      byPriority: {
        urgent: fulfillments.filter(f => f.priority === 'urgent').length,
        high: fulfillments.filter(f => f.priority === 'high').length,
        medium: fulfillments.filter(f => f.priority === 'medium').length,
        low: fulfillments.filter(f => f.priority === 'low').length
      }
    };
  }

  /**
   * Helper methods
   */

  private async getOrderItems(orderId: string, warehouseId: string): Promise<OrderItem[]> {
    // This would fetch from order service
    // For now, return mock data
    return [
      {
        id: 'item1',
        productId: 'prod1',
        productName: 'Product 1',
        sku: 'SKU001',
        quantity: 2,
        unitPrice: 29.99,
        total: 59.98,
        fulfillmentStatus: 'allocated',
        warehouseId
      }
    ];
  }

  private async generatePackingSlip(
    fulfillment: Fulfillment,
    items: PickedItem[],
    boxType: string
  ): Promise<string> {
    // Generate packing slip document
    const slipId = `PS_${fulfillment.id}_${Date.now()}`;
    
    // In reality, would generate PDF or similar
    return slipId;
  }

  private async generateShippingLabel(
    fulfillment: Fulfillment,
    packingSlipId: string
  ): Promise<string> {
    // Generate shipping label
    const trackingNumber = `1Z${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    
    // In reality, would integrate with carrier API
    return trackingNumber;
  }

  private calculateEfficiency(fulfillments: Fulfillment[]): number {
    const completed = fulfillments.filter(f => f.status === 'completed');
    if (completed.length === 0) return 0;

    const onTimeCount = completed.filter(f => {
      if (!f.startedAt || !f.completedAt) return false;
      
      const expectedTime = this.getExpectedFulfillmentTime(f.priority);
      const actualTime = f.completedAt.getTime() - f.startedAt.getTime();
      
      return actualTime <= expectedTime;
    }).length;

    return onTimeCount / completed.length;
  }

  private getExpectedFulfillmentTime(priority: string): number {
    const times: Record<string, number> = {
      urgent: 1800000,  // 30 minutes
      high: 3600000,    // 1 hour
      medium: 7200000,  // 2 hours
      low: 14400000     // 4 hours
    };
    
    return times[priority] || 7200000;
  }

  private generateFulfillmentId(): string {
    return `FULFILL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get fulfillment by ID
   */
  getFulfillment(fulfillmentId: string): Fulfillment | undefined {
    return this.fulfillments.get(fulfillmentId);
  }

  /**
   * Get fulfillments by order
   */
  getOrderFulfillments(orderId: string): Fulfillment[] {
    return Array.from(this.fulfillments.values())
      .filter(f => f.orderId === orderId);
  }
}

/**
 * Workload balancer for worker assignment
 */
class WorkloadBalancer {
  private workers: Map<string, Worker> = new Map();

  async findBestWorker(warehouseId: string, priority: string): Promise<Worker | null> {
    // Simulate worker selection
    const availableWorkers = Array.from(this.workers.values())
      .filter(w => w.warehouseId === warehouseId && w.available);

    if (availableWorkers.length === 0) {
      // Create virtual worker for automation
      return {
        id: `AUTO_${warehouseId}_${Date.now()}`,
        name: 'Automated System',
        warehouseId,
        available: true,
        currentLoad: 0,
        efficiency: 1.0
      };
    }

    // Sort by current load and efficiency
    return availableWorkers.sort((a, b) => {
      const scoreA = a.efficiency / (a.currentLoad + 1);
      const scoreB = b.efficiency / (b.currentLoad + 1);
      return scoreB - scoreA;
    })[0];
  }
}

/**
 * Packing optimizer
 */
class PackingOptimizer {
  async optimizePacking(
    items: PickedItem[],
    orderId: string
  ): Promise<PackingPlan> {
    // Simple box optimization algorithm
    const boxes: Box[] = [];
    const standardBoxCapacity = 10; // items

    let currentBox: Box = {
      id: `BOX_${orderId}_1`,
      boxType: 'standard',
      items: [],
      weight: 0,
      dimensions: { length: 12, width: 12, height: 12 }
    };

    for (const item of items) {
      if (currentBox.items.length >= standardBoxCapacity) {
        boxes.push(currentBox);
        currentBox = {
          id: `BOX_${orderId}_${boxes.length + 1}`,
          boxType: 'standard',
          items: [],
          weight: 0,
          dimensions: { length: 12, width: 12, height: 12 }
        };
      }
      
      currentBox.items.push(item);
      currentBox.weight += 0.5; // Mock weight
    }

    if (currentBox.items.length > 0) {
      boxes.push(currentBox);
    }

    return { boxes, totalBoxes: boxes.length };
  }
}

/**
 * Route optimizer for picking
 */
class RouteOptimizer {
  async generatePickingRoute(
    items: OrderItem[],
    warehouseId: string
  ): Promise<RouteStop[]> {
    // Simple route generation - in reality would use warehouse layout
    return items.map((item, index) => ({
      sequence: index + 1,
      itemId: item.id,
      productId: item.productId,
      quantity: item.quantity,
      location: `A${Math.floor(Math.random() * 10)}-${Math.floor(Math.random() * 100)}`,
      estimatedTime: 120 // seconds
    }));
  }
}

// Type definitions for internal use
interface Worker {
  id: string;
  name: string;
  warehouseId: string;
  available: boolean;
  currentLoad: number;
  efficiency: number;
}

interface PackingPlan {
  boxes: Box[];
  totalBoxes: number;
}

interface Box {
  id: string;
  boxType: string;
  items: PickedItem[];
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
}

interface RouteStop {
  sequence: number;
  itemId: string;
  productId: string;
  quantity: number;
  location: string;
  estimatedTime: number;
}