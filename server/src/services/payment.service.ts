import mongoose, { Types } from 'mongoose';
import Payment, { IPayment } from '../models/payment.model.js';
import Order from '../models/order.model.js';
import { PaymentStatus, PaymentMethod } from '../enums/enums.js';

export class PaymentService {
  /**
   * Process/Create a new payment for an order
   */
  static async createPayment(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IPayment> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const orderObjectId = new Types.ObjectId(data.orderId);

    // 1. Validate order existence, tenant ownership, and deletion status
    const order = await Order.findOne({
      _id: orderObjectId,
      tenantId: tenantObjectId,
      isDeleted: false,
    });
    if (!order) {
      throw new Error('Order not found or does not belong to this tenant');
    }

    // 2. Validate payment amount equals order totalAmount (no partial payments allowed)
    if (Math.abs(Number(data.amount) - order.totalAmount) > 0.01) {
      throw new Error(`Payment amount ${data.amount} must match the order total amount ${order.totalAmount}`);
    }

    const requestedStatus = data.status || PaymentStatus.SUCCESS;

    // 3. Prevent duplicate successful payments
    if (requestedStatus === PaymentStatus.SUCCESS) {
      const existingSuccess = await Payment.findOne({
        orderId: orderObjectId,
        tenantId: tenantObjectId,
        status: PaymentStatus.SUCCESS,
        isDeleted: false,
      });
      if (existingSuccess) {
        throw new Error('A successful payment has already been processed for this order.');
      }
    }

    // 4. Check for transactionId unique conflict
    const existingTx = await Payment.findOne({
      transactionId: data.transactionId,
      isDeleted: false,
    });
    if (existingTx) {
      throw new Error('A payment with this transaction ID already exists.');
    }

    // 5. Save payment & update order status using a MongoDB transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payment = new Payment({
        tenantId: tenantObjectId,
        orderId: orderObjectId,
        transactionId: data.transactionId,
        paymentMethod: data.paymentMethod as PaymentMethod,
        amount: Number(data.amount),
        currency: data.currency || 'INR',
        status: requestedStatus as PaymentStatus,
        gatewayResponse: data.gatewayResponse || null,
        createdBy: userId ? new Types.ObjectId(userId) : null,
        updatedBy: userId ? new Types.ObjectId(userId) : null,
      });

      const savedPayment = await payment.save({ session });

      // Synchronize Order paymentStatus
      await Order.updateOne(
        { _id: orderObjectId, tenantId: tenantObjectId },
        {
          paymentStatus: requestedStatus as PaymentStatus,
          updatedBy: userId ? new Types.ObjectId(userId) : null,
        },
        { session }
      );

      await session.commitTransaction();
      return savedPayment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Process a refund for a payment
   */
  static async refundPayment(
    id: string,
    tenantId: string,
    refundTransactionId: string,
    userId?: string
  ): Promise<IPayment | null> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const paymentObjectId = new Types.ObjectId(id);

    // 1. Fetch existing payment
    const payment = await Payment.findOne({
      _id: paymentObjectId,
      tenantId: tenantObjectId,
      isDeleted: false,
    });

    if (!payment) {
      return null;
    }

    // 2. Validate status rules
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new Error(`Only successful payments can be refunded. Current status is ${payment.status}`);
    }

    // 3. Check for refund transactionId uniqueness conflict
    const existingTx = await Payment.findOne({
      transactionId: refundTransactionId,
      isDeleted: false,
    });
    if (existingTx) {
      throw new Error('A payment/refund with this transaction ID already exists.');
    }

    // 4. Save refund updates and update order paymentStatus under transaction session
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: paymentObjectId, tenantId: tenantObjectId },
        {
          status: PaymentStatus.REFUNDED,
          refundedAt: new Date(),
          refundTransactionId,
          updatedBy: userId ? new Types.ObjectId(userId) : null,
        },
        { new: true, session }
      );

      // Synchronize Order paymentStatus to REFUNDED
      await Order.updateOne(
        { _id: payment.orderId, tenantId: tenantObjectId },
        {
          paymentStatus: PaymentStatus.REFUNDED,
          updatedBy: userId ? new Types.ObjectId(userId) : null,
        },
        { session }
      );

      await session.commitTransaction();
      return updatedPayment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Retrieve payment by ID
   */
  static async getPaymentById(id: string, tenantId: string): Promise<IPayment | null> {
    return await Payment.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Retrieve payment by Order ID
   */
  static async getPaymentByOrderId(orderId: string, tenantId: string): Promise<IPayment | null> {
    return await Payment.findOne({
      orderId: new Types.ObjectId(orderId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  /**
   * Retrieve list of payments with filtering
   */
  static async getPayments(
    tenantId: string,
    filters: { orderId?: string; status?: string; limit: number; skip: number }
  ): Promise<{ payments: IPayment[]; total: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (filters.orderId) {
      query.orderId = new Types.ObjectId(filters.orderId);
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit)
        .skip(filters.skip),
      Payment.countDocuments(query),
    ]);

    return { payments, total };
  }
}
