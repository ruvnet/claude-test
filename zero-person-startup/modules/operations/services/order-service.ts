/**
 * Autonomous Order Processing Service
 * Handles order lifecycle from creation to delivery
 */

import { EventEmitter } from 'events';
import {
  Order,
  OrderStatus,
  OrderItem,
  PaymentInfo,
  ShippingInfo,
  TrackingInfo,
  TrackingEvent,
  Address,
  OperationsConfig,
  Product
} from '../types.js';

export class OrderService extends EventEmitter {
  private orders: Map<string, Order> = new Map();
  private config: OperationsConfig;
  private paymentProcessor: PaymentProcessor;
  private shippingCalculator: ShippingCalculator;
  private taxCalculator: TaxCalculator;

  constructor(config: OperationsConfig) {
    super();
    this.config = config;
    this.paymentProcessor = new PaymentProcessor();
    this.shippingCalculator = new ShippingCalculator(config.shipping);
    this.taxCalculator = new TaxCalculator();
  }

  /**
   * Create new order
   */
  async createOrder(
    customerId: string,
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
    }[],
    shippingAddress: Address,
    billingAddress: Address,
    paymentMethod: PaymentInfo['method'],
    shippingMethod: string
  ): Promise<Order> {
    const orderId = this.generateOrderId();
    const orderNumber = this.generateOrderNumber();

    // Calculate order items
    const orderItems: OrderItem[] = items.map(item => ({
      id: this.generateOrderItemId(),
      productId: item.productId,
      productName: '', // Will be populated from product service
      sku: '', // Will be populated from product service
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice,
      fulfillmentStatus: 'pending'
    }));

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0);
    const tax = await this.taxCalculator.calculateTax(subtotal, shippingAddress);
    const shippingCost = await this.shippingCalculator.calculateShipping(
      orderItems,
      shippingAddress,
      shippingMethod
    );
    const total = subtotal + tax + shippingCost;

    // Determine shipping info
    const shippingInfo: ShippingInfo = {
      method: shippingMethod,
      carrier: this.config.shipping.defaultCarrier,
      serviceLevel: this.determineServiceLevel(shippingMethod),
      estimatedDelivery: this.calculateEstimatedDelivery(shippingMethod),
      cost: shippingCost,
      insurance: total > this.config.shipping.insuranceThreshold ? total * 0.01 : 0,
      signature: total > 500
    };

    // Create order
    const order: Order = {
      id: orderId,
      customerId,
      orderNumber,
      status: 'pending',
      items: orderItems,
      shippingAddress,
      billingAddress,
      payment: {
        method: paymentMethod,
        status: 'pending',
        amount: total,
        currency: 'USD'
      },
      shipping: shippingInfo,
      subtotal,
      tax,
      shippingCost,
      total,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.orders.set(orderId, order);

    // Emit order created event
    this.emit('event', {
      eventType: 'order.created',
      entityId: orderId,
      entityType: 'order',
      data: {
        orderNumber,
        customerId,
        total,
        itemCount: orderItems.length
      },
      timestamp: new Date()
    });

    // Process payment
    this.processOrderPayment(order);

    return order;
  }

  /**
   * Process order payment
   */
  private async processOrderPayment(order: Order): Promise<void> {
    try {
      // Authorize payment
      const authResult = await this.paymentProcessor.authorize(
        order.payment.method,
        order.total,
        order.customerId
      );

      if (authResult.success) {
        order.payment.status = 'authorized';
        order.payment.transactionId = authResult.transactionId;
        order.status = 'confirmed';

        // Emit payment success event
        this.emit('event', {
          eventType: 'order.payment.authorized',
          entityId: order.id,
          entityType: 'order',
          data: {
            transactionId: authResult.transactionId,
            amount: order.total
          },
          timestamp: new Date()
        });

        // Request inventory allocation
        this.emit('inventory-request', {
          type: 'reserve',
          orderId: order.id,
          items: order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity
          }))
        });

        // Start order processing
        setTimeout(() => {
          this.startOrderProcessing(order.id);
        }, 1000);

      } else {
        order.payment.status = 'failed';
        order.status = 'cancelled';

        this.emit('alert', {
          type: 'payment-failed',
          severity: 'high',
          orderId: order.id,
          reason: authResult.error,
          timestamp: new Date()
        });
      }
    } catch (error) {
      order.payment.status = 'failed';
      order.status = 'cancelled';
      
      this.emit('error', {
        type: 'payment-processing',
        orderId: order.id,
        error: error.message,
        timestamp: new Date()
      });
    }

    order.updatedAt = new Date();
  }

  /**
   * Start order processing
   */
  private async startOrderProcessing(orderId: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'confirmed') return;

    order.status = 'processing';
    order.updatedAt = new Date();

    // Capture payment
    if (order.payment.status === 'authorized' && order.payment.transactionId) {
      const captureResult = await this.paymentProcessor.capture(
        order.payment.transactionId,
        order.total
      );

      if (captureResult.success) {
        order.payment.status = 'captured';
        order.payment.processedAt = new Date();
      }
    }

    // Request fulfillment
    this.emit('fulfillment-request', {
      type: 'create',
      orderId: order.id,
      priority: this.determineFulfillmentPriority(order),
      items: order.items,
      shippingAddress: order.shippingAddress,
      shippingInfo: order.shipping
    });

    this.emit('event', {
      eventType: 'order.processing',
      entityId: orderId,
      entityType: 'order',
      data: {
        orderNumber: order.orderNumber
      },
      timestamp: new Date()
    });
  }

  /**
   * Update order status
   */
  async updateOrderStatus(orderId: string, status: OrderStatus): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date();

    if (status === 'delivered') {
      order.fulfilledAt = new Date();
    }

    // Handle status-specific actions
    switch (status) {
      case 'shipped':
        await this.handleOrderShipped(order);
        break;
      case 'delivered':
        await this.handleOrderDelivered(order);
        break;
      case 'cancelled':
        await this.handleOrderCancelled(order);
        break;
    }

    this.emit('event', {
      eventType: 'order.updated',
      entityId: orderId,
      entityType: 'order',
      data: {
        previousStatus,
        newStatus: status
      },
      timestamp: new Date()
    });

    return order;
  }

  /**
   * Update order item fulfillment status
   */
  async updateItemFulfillment(
    orderId: string,
    itemId: string,
    status: OrderItem['fulfillmentStatus'],
    warehouseId?: string,
    trackingNumber?: string
  ): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    const item = order.items.find(i => i.id === itemId);
    if (!item) return;

    item.fulfillmentStatus = status;
    if (warehouseId) item.warehouseId = warehouseId;
    if (trackingNumber) item.trackingNumber = trackingNumber;

    // Check if all items are fulfilled
    const allItemsFulfilled = order.items.every(
      i => ['packed', 'shipped'].includes(i.fulfillmentStatus)
    );

    if (allItemsFulfilled && order.status === 'processing') {
      await this.updateOrderStatus(orderId, 'packed');
    }
  }

  /**
   * Add tracking information
   */
  async addTrackingInfo(
    orderId: string,
    carrier: string,
    trackingNumber: string
  ): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) return;

    if (!order.tracking) {
      order.tracking = [];
    }

    const trackingInfo: TrackingInfo = {
      carrier,
      trackingNumber,
      status: 'Label Created',
      lastUpdate: new Date(),
      estimatedDelivery: order.shipping.estimatedDelivery,
      events: [
        {
          timestamp: new Date(),
          location: 'Fulfillment Center',
          status: 'Label Created',
          description: 'Shipping label has been created'
        }
      ]
    };

    order.tracking.push(trackingInfo);

    // Start tracking updates
    this.startTrackingUpdates(orderId, trackingInfo);
  }

  /**
   * Handle order shipped
   */
  private async handleOrderShipped(order: Order): Promise<void> {
    // Send shipping notification
    this.emit('notification', {
      type: 'order-shipped',
      customerId: order.customerId,
      orderId: order.id,
      data: {
        orderNumber: order.orderNumber,
        trackingNumbers: order.tracking?.map(t => t.trackingNumber) || [],
        estimatedDelivery: order.shipping.estimatedDelivery
      }
    });

    // Update inventory (deduct from physical stock)
    this.emit('inventory-request', {
      type: 'ship',
      orderId: order.id,
      items: order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        warehouseId: item.warehouseId
      }))
    });
  }

  /**
   * Handle order delivered
   */
  private async handleOrderDelivered(order: Order): Promise<void> {
    // Send delivery confirmation
    this.emit('notification', {
      type: 'order-delivered',
      customerId: order.customerId,
      orderId: order.id,
      data: {
        orderNumber: order.orderNumber,
        deliveredAt: order.fulfilledAt
      }
    });

    // Request feedback
    setTimeout(() => {
      this.emit('feedback-request', {
        customerId: order.customerId,
        orderId: order.id,
        type: 'order-satisfaction'
      });
    }, 86400000); // 24 hours
  }

  /**
   * Handle order cancelled
   */
  private async handleOrderCancelled(order: Order): Promise<void> {
    // Release inventory reservations
    this.emit('inventory-request', {
      type: 'release',
      orderId: order.id,
      items: order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        warehouseId: item.warehouseId
      }))
    });

    // Process refund if payment was captured
    if (order.payment.status === 'captured' && order.payment.transactionId) {
      const refundResult = await this.paymentProcessor.refund(
        order.payment.transactionId,
        order.total
      );

      if (refundResult.success) {
        order.payment.status = 'refunded';
        
        this.emit('notification', {
          type: 'order-refunded',
          customerId: order.customerId,
          orderId: order.id,
          data: {
            orderNumber: order.orderNumber,
            refundAmount: order.total
          }
        });
      }
    }
  }

  /**
   * Start tracking updates (simulated)
   */
  private startTrackingUpdates(orderId: string, trackingInfo: TrackingInfo): void {
    const events = [
      { delay: 3600000, status: 'Picked Up', location: 'Local Facility', description: 'Package picked up by carrier' },
      { delay: 7200000, status: 'In Transit', location: 'Regional Hub', description: 'Package in transit to destination' },
      { delay: 86400000, status: 'Out for Delivery', location: 'Local Delivery Center', description: 'Package out for delivery' },
      { delay: 93600000, status: 'Delivered', location: 'Customer Address', description: 'Package delivered successfully' }
    ];

    events.forEach(event => {
      setTimeout(() => {
        const order = this.orders.get(orderId);
        if (!order) return;

        const tracking = order.tracking?.find(t => t.trackingNumber === trackingInfo.trackingNumber);
        if (!tracking) return;

        const trackingEvent: TrackingEvent = {
          timestamp: new Date(),
          location: event.location,
          status: event.status,
          description: event.description
        };

        tracking.events.push(trackingEvent);
        tracking.status = event.status;
        tracking.lastUpdate = new Date();

        if (event.status === 'Delivered') {
          this.updateOrderStatus(orderId, 'delivered');
        }
      }, event.delay);
    });
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get orders by customer
   */
  getCustomerOrders(customerId: string): Order[] {
    return Array.from(this.orders.values())
      .filter(order => order.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get orders by status
   */
  getOrdersByStatus(status: OrderStatus): Order[] {
    return Array.from(this.orders.values())
      .filter(order => order.status === status);
  }

  /**
   * Search orders
   */
  searchOrders(query: string): Order[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.orders.values())
      .filter(order => 
        order.orderNumber.toLowerCase().includes(lowerQuery) ||
        order.customerId.includes(lowerQuery) ||
        order.items.some(item => item.productName.toLowerCase().includes(lowerQuery))
      );
  }

  /**
   * Get order metrics
   */
  getMetrics(): any {
    const orders = Array.from(this.orders.values());
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentOrders = orders.filter(o => o.createdAt >= last30Days);
    const deliveredOrders = recentOrders.filter(o => o.status === 'delivered');

    const averageFulfillmentTime = deliveredOrders.reduce((sum, order) => {
      if (order.fulfilledAt) {
        return sum + (order.fulfilledAt.getTime() - order.createdAt.getTime());
      }
      return sum;
    }, 0) / (deliveredOrders.length || 1);

    const onTimeDeliveries = deliveredOrders.filter(order => {
      if (order.fulfilledAt && order.shipping.estimatedDelivery) {
        return order.fulfilledAt <= order.shipping.estimatedDelivery;
      }
      return false;
    });

    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'pending').length,
      processing: orders.filter(o => o.status === 'processing').length,
      shipped: orders.filter(o => o.status === 'shipped').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
      averageFulfillmentTime: averageFulfillmentTime / (1000 * 60 * 60), // in hours
      onTimeDeliveryRate: deliveredOrders.length > 0 
        ? onTimeDeliveries.length / deliveredOrders.length 
        : 1,
      recentOrderValue: recentOrders.reduce((sum, o) => sum + o.total, 0),
      averageOrderValue: recentOrders.length > 0
        ? recentOrders.reduce((sum, o) => sum + o.total, 0) / recentOrders.length
        : 0
    };
  }

  /**
   * Helper methods
   */

  private generateOrderId(): string {
    return `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private generateOrderNumber(): string {
    return `#${Date.now().toString().slice(-6)}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
  }

  private generateOrderItemId(): string {
    return `ITEM_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private determineServiceLevel(shippingMethod: string): ShippingInfo['serviceLevel'] {
    const methodMap: Record<string, ShippingInfo['serviceLevel']> = {
      'standard': 'standard',
      'express': 'express',
      'overnight': 'overnight',
      'economy': 'economy',
      'priority': 'express',
      '2-day': 'express'
    };

    return methodMap[shippingMethod.toLowerCase()] || 'standard';
  }

  private calculateEstimatedDelivery(shippingMethod: string): Date {
    const deliveryDays: Record<string, number> = {
      'overnight': 1,
      'express': 2,
      'priority': 2,
      '2-day': 2,
      'standard': 5,
      'economy': 7
    };

    const days = deliveryDays[shippingMethod.toLowerCase()] || 5;
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + days);

    // Skip weekends
    if (estimatedDate.getDay() === 0) estimatedDate.setDate(estimatedDate.getDate() + 1);
    if (estimatedDate.getDay() === 6) estimatedDate.setDate(estimatedDate.getDate() + 2);

    return estimatedDate;
  }

  private determineFulfillmentPriority(order: Order): 'low' | 'medium' | 'high' | 'urgent' {
    // Priority based on shipping method and order value
    if (order.shipping.serviceLevel === 'overnight') return 'urgent';
    if (order.shipping.serviceLevel === 'express') return 'high';
    if (order.total > 1000) return 'high';
    if (order.total > 500) return 'medium';
    return 'low';
  }
}

/**
 * Payment processor (simplified)
 */
class PaymentProcessor {
  async authorize(method: string, amount: number, customerId: string): Promise<any> {
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 95% success rate
    const success = Math.random() > 0.05;
    
    return {
      success,
      transactionId: success ? `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` : null,
      error: success ? null : 'Payment declined'
    };
  }

  async capture(transactionId: string, amount: number): Promise<any> {
    // Simulate capture
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      success: true,
      capturedAmount: amount
    };
  }

  async refund(transactionId: string, amount: number): Promise<any> {
    // Simulate refund
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      refundId: `REFUND_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      refundedAmount: amount
    };
  }
}

/**
 * Shipping calculator
 */
class ShippingCalculator {
  private config: OperationsConfig['shipping'];

  constructor(config: OperationsConfig['shipping']) {
    this.config = config;
  }

  async calculateShipping(
    items: OrderItem[],
    destination: Address,
    method: string
  ): Promise<number> {
    // Simple calculation based on method and item count
    const baseRates: Record<string, number> = {
      'economy': 5.99,
      'standard': 9.99,
      'express': 19.99,
      'overnight': 39.99
    };

    const baseRate = baseRates[method.toLowerCase()] || 9.99;
    const itemSurcharge = items.length * 0.5;
    
    // Zone surcharge based on destination
    let zoneSurcharge = 0;
    if (destination.state && ['AK', 'HI'].includes(destination.state)) {
      zoneSurcharge = 10;
    }

    return baseRate + itemSurcharge + zoneSurcharge;
  }
}

/**
 * Tax calculator
 */
class TaxCalculator {
  async calculateTax(subtotal: number, address: Address): Promise<number> {
    // Simple state-based tax calculation
    const stateTaxRates: Record<string, number> = {
      'CA': 0.0725,
      'NY': 0.08,
      'TX': 0.0625,
      'FL': 0.06,
      'WA': 0.065,
      // Add more states...
    };

    const taxRate = stateTaxRates[address.state] || 0.05; // Default 5%
    return Math.round(subtotal * taxRate * 100) / 100;
  }
}