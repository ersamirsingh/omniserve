import { SubscriptionService } from "../modules/subscription/subscription.service.js";

export function startSubscriptionBillingWorkers() {
  // Run an immediate check on startup
  (async () => {
    try {
      console.log("[SubscriptionJob] Initializing startup subscription checks...");
      await SubscriptionService.seedDefaultPlans();
      await SubscriptionService.processDailyExpirationChecks();
    } catch (err) {
      console.error("[SubscriptionJob] Startup subscription check failed:", err);
    }
  })();

  // Daily Expiration check - runs every 12 hours
  setInterval(async () => {
    try {
      console.log("[SubscriptionJob] Running scheduled subscription expiration checks...");
      await SubscriptionService.processDailyExpirationChecks();
    } catch (err) {
      console.error("[SubscriptionJob] Expiration check failed:", err);
    }
  }, 12 * 60 * 60 * 1000);

  // Monthly Usage Reset check - runs once a day. If today is the 1st, resets.
  setInterval(async () => {
    try {
      const today = new Date();
      if (today.getDate() === 1) {
        console.log("[SubscriptionJob] First of the month. Resets usage counters...");
        await SubscriptionService.processMonthlyUsageResets();
      }
    } catch (err) {
      console.error("[SubscriptionJob] Usage resets failed:", err);
    }
  }, 24 * 60 * 60 * 1000);
}
