import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { PaymentService } from '../services/payment.service.js';
import { ApiResponseHandler } from '../utils/response.handler.js';
import { PaymentMethod, PaymentStatus } from '../enums/enums.js';

export class PaymentController {
  /**
   * Process/Create a payment
   * POST /payments
   */
  static async createPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { orderId, transactionId, paymentMethod, amount, currency, status, gatewayResponse } = req.body;

      // Validate required fields
      if (!orderId || !transactionId || !paymentMethod || amount === undefined) {
        ApiResponseHandler.badRequest(res, 'orderId, transactionId, paymentMethod, and amount are required');
        return;
      }

      // Validate ObjectId
      if (!Types.ObjectId.isValid(orderId)) {
        ApiResponseHandler.badRequest(res, 'Invalid orderId format');
        return;
      }

      // Validate transactionId
      if (typeof transactionId !== 'string' || transactionId.trim().length === 0) {
        ApiResponseHandler.badRequest(res, 'transactionId must be a non-empty string');
        return;
      }

      // Validate paymentMethod enum
      if (!Object.values(PaymentMethod).includes(paymentMethod)) {
        ApiResponseHandler.badRequest(res, `Invalid payment method. Must be one of: ${Object.values(PaymentMethod).join(', ')}`);
        return;
      }

      // Validate status enum if provided
      if (status && !Object.values(PaymentStatus).includes(status)) {
        ApiResponseHandler.badRequest(res, `Invalid payment status. Must be one of: ${Object.values(PaymentStatus).join(', ')}`);
        return;
      }

      // Validate amount
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        ApiResponseHandler.badRequest(res, 'Amount must be a positive number');
        return;
      }

      const paymentData = {
        orderId,
        transactionId: transactionId.trim(),
        paymentMethod,
        amount: numAmount,
        currency: currency ? String(currency).trim() : 'INR',
        status: status || PaymentStatus.SUCCESS,
        gatewayResponse,
      };

      const payment = await PaymentService.createPayment(
        req.user.tenantId,
        paymentData,
        req.user.userId
      );

      ApiResponseHandler.success(res, 201, 'Payment processed successfully', {
        id: payment._id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        createdAt: payment.createdAt,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to process payment');
    }
  }

  /**
   * Refund a payment
   * PATCH /payments/:id/refund
   */
  static async refundPayment(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid payment ID format');
        return;
      }

      const { refundTransactionId } = req.body;
      if (!refundTransactionId || typeof refundTransactionId !== 'string' || refundTransactionId.trim().length === 0) {
        ApiResponseHandler.badRequest(res, 'refundTransactionId must be a non-empty string');
        return;
      }

      const payment = await PaymentService.refundPayment(
        id,
        req.user.tenantId,
        refundTransactionId.trim(),
        req.user.userId
      );

      if (!payment) {
        ApiResponseHandler.notFound(res, 'Payment record not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Refund processed successfully', {
        id: payment._id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        status: payment.status,
        refundedAt: payment.refundedAt,
        refundTransactionId: payment.refundTransactionId,
      });
    } catch (error: any) {
      ApiResponseHandler.badRequest(res, error.message || 'Failed to process refund');
    }
  }

  /**
   * Get payment by ID
   * GET /payments/:id
   */
  static async getPaymentById(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { id } = req.params as { id: string };
      if (!Types.ObjectId.isValid(id)) {
        ApiResponseHandler.badRequest(res, 'Invalid payment ID format');
        return;
      }

      const payment = await PaymentService.getPaymentById(id, req.user.tenantId);
      if (!payment) {
        ApiResponseHandler.notFound(res, 'Payment not found');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Payment details retrieved successfully', {
        id: payment._id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        refundedAt: payment.refundedAt,
        refundTransactionId: payment.refundTransactionId,
        createdAt: payment.createdAt,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve payment');
    }
  }

  /**
   * Get payment by Order ID
   * GET /payments/order/:orderId
   */
  static async getPaymentByOrderId(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const { orderId } = req.params as { orderId: string };
      if (!Types.ObjectId.isValid(orderId)) {
        ApiResponseHandler.badRequest(res, 'Invalid order ID format');
        return;
      }

      const payment = await PaymentService.getPaymentByOrderId(orderId, req.user.tenantId);
      if (!payment) {
        ApiResponseHandler.notFound(res, 'Payment details not found for this order');
        return;
      }

      ApiResponseHandler.success(res, 200, 'Payment details retrieved successfully', {
        id: payment._id,
        orderId: payment.orderId,
        transactionId: payment.transactionId,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        refundedAt: payment.refundedAt,
        refundTransactionId: payment.refundTransactionId,
        createdAt: payment.createdAt,
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to retrieve payment details');
    }
  }

  /**
   * List Payments
   * GET /payments
   */
  static async listPayments(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user?.tenantId) {
        ApiResponseHandler.unauthorized(res, 'User not authenticated or tenantId not found');
        return;
      }

      const orderId = req.query.orderId as string | undefined;
      const status = req.query.status as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      if (orderId && !Types.ObjectId.isValid(orderId)) {
        ApiResponseHandler.badRequest(res, 'Invalid orderId query parameter format');
        return;
      }

      const filters: { orderId?: string; status?: string; limit: number; skip: number } = { limit, skip };
      if (orderId) filters.orderId = orderId;
      if (status) filters.status = status;

      const { payments, total } = await PaymentService.getPayments(req.user.tenantId, filters);

      ApiResponseHandler.success(res, 200, 'Payments retrieved successfully', {
        payments: payments.map(p => ({
          id: p._id,
          orderId: p.orderId,
          transactionId: p.transactionId,
          paymentMethod: p.paymentMethod,
          amount: p.amount,
          currency: p.currency,
          status: p.status,
          refundedAt: p.refundedAt,
          refundTransactionId: p.refundTransactionId,
          createdAt: p.createdAt,
        })),
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      ApiResponseHandler.internalError(res, error.message || 'Failed to list payments');
    }
  }
}
