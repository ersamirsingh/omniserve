import mongoose, { Types } from 'mongoose';
import Payment, { IPayment } from "../../models/payment.model.js";
import Order from "../../models/order.model.js";
import { PaymentStatus, PaymentMethod, NotificationType } from "../../models/enums.js";
import { NotificationService } from "../notification/notification.service.js";

export class PaymentService {

  static async createPayment(
    tenantId: string,
    data: any,
    userId?: string
  ): Promise<IPayment> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const orderObjectId = new Types.ObjectId(data.orderId);

    const order = await Order.findOne({
      _id: orderObjectId,
      tenantId: tenantObjectId,
      isDeleted: false,
    });
    if (!order) {
      throw new Error('Order not found or does not belong to this tenant');
    }

    if (Math.abs(Number(data.amount) - order.totalAmount) > 0.01) {
      throw new Error(`Payment amount ${data.amount} must match the order total amount ${order.totalAmount}`);
    }

    const requestedStatus = data.status || PaymentStatus.SUCCESS;

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

    const existingTx = await Payment.findOne({
      transactionId: data.transactionId,
      isDeleted: false,
    });
    if (existingTx) {
      throw new Error('A payment with this transaction ID already exists.');
    }

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

      console.log(`[PaymentService] Payment processed: status=${savedPayment.status}, amount=${savedPayment.amount}, orderId=${savedPayment.orderId}, transactionId=${savedPayment.transactionId}`);

      await Order.updateOne(
        { _id: orderObjectId, tenantId: tenantObjectId },
        {
          paymentStatus: requestedStatus as PaymentStatus,
          updatedBy: userId ? new Types.ObjectId(userId) : null,
        },
        { session }
      );

      await session.commitTransaction();

      const isSuccess = savedPayment.status === PaymentStatus.SUCCESS;
      const title = isSuccess ? 'Payment Successful' : 'Payment Failed';
      const message = isSuccess
        ? `Payment of ${savedPayment.amount} ${savedPayment.currency} for Order ${order.orderNumber} was successful. Transaction: ${savedPayment.transactionId}.`
        : `Payment of ${savedPayment.amount} ${savedPayment.currency} for Order ${order.orderNumber} failed. Transaction: ${savedPayment.transactionId}.`;
      const nType = isSuccess ? NotificationType.PAYMENT_SUCCESS : NotificationType.PAYMENT_FAILED;

      NotificationService.notifyTenantUsers(
        tenantId,
        title,
        message,
        nType,
        savedPayment._id.toString(),
        'Payment',
        userId
      ).catch(err => console.error('Failed to dispatch payment notification:', err));

      return savedPayment;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async refundPayment(
    id: string,
    tenantId: string,
    refundTransactionId: string,
    userId?: string
  ): Promise<IPayment | null> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const paymentObjectId = new Types.ObjectId(id);

    const payment = await Payment.findOne({
      _id: paymentObjectId,
      tenantId: tenantObjectId,
      isDeleted: false,
    });

    if (!payment) {
      return null;
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new Error(`Only successful payments can be refunded. Current status is ${payment.status}`);
    }

    const existingTx = await Payment.findOne({
      transactionId: refundTransactionId,
      isDeleted: false,
    });
    if (existingTx) {
      throw new Error('A payment/refund with this transaction ID already exists.');
    }

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

  static async getPaymentById(id: string, tenantId: string): Promise<IPayment | null> {
    return await Payment.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

  static async getPaymentByOrderId(orderId: string, tenantId: string): Promise<IPayment | null> {
    return await Payment.findOne({
      orderId: new Types.ObjectId(orderId),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    });
  }

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
