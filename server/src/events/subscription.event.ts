import { Types } from "mongoose";
import { EmailService } from "../modules/notification/email.service.js";
import { RealtimeService } from "../sockets/realtime.service.js";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import { NotificationType } from "../models/enums.js";

export class SubscriptionEventPublisher {
  /**
   * Helper to resolve restaurant owner user for a tenant
   */
  private static async getOwnerUser(tenantId: string | Types.ObjectId) {
    return await User.findOne({
      tenantId: new Types.ObjectId(tenantId),
      role: "RESTAURANT_OWNER",
      isDeleted: false,
    });
  }

  /**
   * Publishes subscription expiration alerts (T-7, T-3, T-1 warnings)
   */
  static async publishExpirationWarning(
    tenantId: string | Types.ObjectId,
    daysRemaining: number
  ): Promise<void> {
    const owner = await this.getOwnerUser(tenantId);
    if (!owner) return;

    const title = `Subscription Expiring in ${daysRemaining} Days`;
    const message = `Your FoodMesh SaaS subscription plan will expire in ${daysRemaining} days. Please upgrade or renew to keep your features active.`;

    // 1. Create In-App Notification
    await Notification.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: owner._id,
      title,
      message,
      type: NotificationType.OPERATIONAL_ALERT,
    });

    // 2. Dispatch Email
    try {
      await EmailService.sendMail({
        to: owner.email,
        subject: `[FoodMesh] Subscription Expiry Warning - ${daysRemaining} Days`,
        text: message,
        html: `<p>${message}</p>`,
      });
    } catch (err) {
      console.error("[SubscriptionEvent] Failed to send email alert:", err);
    }

    // 3. WhatsApp Integration (Simulated Stub)
    console.info(`[WhatsApp Notify] Sent alert to owner phone ${owner.phone || "N/A"}: ${title}`);

    // 4. Real-time WebSocket sync
    if ((RealtimeService as any).io) {
      (RealtimeService as any).io.emit("SUBSCRIPTION_ALERT", {
        type: "EXPIRY_WARNING",
        daysRemaining,
        title,
        message,
        tenantId: tenantId.toString()
      });
    }
  }

  /**
   * Publishes when subscription expired (and transitions to grace period or locked)
   */
  static async publishExpired(
    tenantId: string | Types.ObjectId,
    locked = false
  ): Promise<void> {
    const owner = await this.getOwnerUser(tenantId);
    if (!owner) return;

    const title = locked ? "Subscription Locked (EXPIRED)" : "Subscription Expired - Grace Period Started";
    const message = locked
      ? "Your grace period has ended. Your FoodMesh account is now READ-ONLY. Please upgrade immediately to unlock features."
      : "Your active billing period has ended. A 7-day grace period has started to prevent immediate interruption.";

    await Notification.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: owner._id,
      title,
      message,
      type: NotificationType.OPERATIONAL_ALERT,
    });

    try {
      await EmailService.sendMail({
        to: owner.email,
        subject: `[FoodMesh] ${title}`,
        text: message,
        html: `<p>${message}</p>`,
      });
    } catch (err) {
      console.error("[SubscriptionEvent] Failed to send email alert:", err);
    }

    console.info(`[WhatsApp Notify] Sent alert to owner phone ${owner.phone || "N/A"}: ${title}`);

    if ((RealtimeService as any).io) {
      (RealtimeService as any).io.emit("SUBSCRIPTION_ALERT", {
        type: locked ? "LOCKED" : "GRACE_PERIOD_STARTED",
        title,
        message,
        tenantId: tenantId.toString()
      });
    }
  }

  /**
   * Publishes payment outcomes (SUCCESS / FAILED)
   */
  static async publishPaymentOutcome(
    tenantId: string | Types.ObjectId,
    invoiceNumber: string,
    success: boolean,
    amount: number
  ): Promise<void> {
    const owner = await this.getOwnerUser(tenantId);
    if (!owner) return;

    const title = success ? "Payment Successful" : "Payment Action Required - Failed";
    const message = success
      ? `Thank you! Your payment of ₹${amount} for invoice ${invoiceNumber} was successfully processed.`
      : `Warning: Payment of ₹${amount} for invoice ${invoiceNumber} failed. Please verify your payment methods to avoid account lock.`;

    await Notification.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: owner._id,
      title,
      message,
      type: success ? NotificationType.PAYMENT_SUCCESS : NotificationType.PAYMENT_FAILED,
    });

    try {
      await EmailService.sendMail({
        to: owner.email,
        subject: `[FoodMesh] Billing Update: ${title}`,
        text: message,
        html: `<p>${message}</p>`,
      });
    } catch (err) {
      console.error("[SubscriptionEvent] Failed to send email alert:", err);
    }

    console.info(`[WhatsApp Notify] Sent billing status to ${owner.phone || "N/A"}: ${title}`);

    if ((RealtimeService as any).io) {
      (RealtimeService as any).io.emit("SUBSCRIPTION_ALERT", {
        type: success ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED",
        invoiceNumber,
        amount,
        title,
        message,
        tenantId: tenantId.toString()
      });
    }
  }

  /**
   * Publishes auto-renewals or plan upgrades
   */
  static async publishRenewedOrUpgraded(
    tenantId: string | Types.ObjectId,
    planName: string,
    action: "RENEWED" | "UPGRADED"
  ): Promise<void> {
    const owner = await this.getOwnerUser(tenantId);
    if (!owner) return;

    const title = `Subscription Plan ${action}`;
    const message = `Excellent news! Your FoodMesh plan has been successfully ${action.toLowerCase()} to the ${planName}. All subscription limits and features are active.`;

    await Notification.create({
      tenantId: new Types.ObjectId(tenantId),
      userId: owner._id,
      title,
      message,
      type: NotificationType.OPERATIONAL_ALERT,
    });

    try {
      await EmailService.sendMail({
        to: owner.email,
        subject: `[FoodMesh] Plan Updated - ${planName}`,
        text: message,
        html: `<p>${message}</p>`,
      });
    } catch (err) {
      console.error("[SubscriptionEvent] Failed to send email alert:", err);
    }

    console.info(`[WhatsApp Notify] Sent update message to ${owner.phone || "N/A"}: ${title}`);

    if ((RealtimeService as any).io) {
      (RealtimeService as any).io.emit("SUBSCRIPTION_ALERT", {
        type: action,
        planName,
        title,
        message,
        tenantId: tenantId.toString()
      });
    }
  }
}
