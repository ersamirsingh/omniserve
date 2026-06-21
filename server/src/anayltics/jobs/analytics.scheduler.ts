
import cron from "node-cron";

import Tenant from "../../models/tenant.model.js";
import Outlet from "../../models/outlet.model.js";

import { generateDailyAnalytics } from "./daily-analytics.job.js";
import { generateHourlyAnalytics } from "./hourly-analytics.job.js";
import { generateCustomerAnalytics } from "./customer-analytics.job.js";
import { generateMenuAnalytics } from "./menu-analytics.job.js";

export function startAnalyticsScheduler() {
  cron.schedule("0 0 * * *", async () => {
    console.log("Starting analytics aggregation...");

    try {
      const reportDate = new Date();

      const tenants = await Tenant.find({
        isDeleted: false,
      }).select("_id");

      for (const tenant of tenants) {
        try {
          const outlets = await Outlet.find({
            tenantId: tenant._id,
            isDeleted: false,
          }).select("_id");

          for (const outlet of outlets) {
            try {
              await generateDailyAnalytics(
                tenant._id.toString(),
                outlet._id.toString(),
                reportDate
              );

              await generateHourlyAnalytics(
                tenant._id.toString(),
                outlet._id.toString(),
                reportDate
              );

              await generateMenuAnalytics(
                tenant._id.toString(),
                outlet._id.toString(),
                reportDate
              );

              console.log(
                `Analytics generated for outlet ${outlet._id}`
              );
            } catch (error) {
              console.error(
                `Outlet analytics failed: ${outlet._id}`,
                error
              );
            }
          }

          await generateCustomerAnalytics(
            tenant._id.toString(),
            reportDate
          );
        } catch (error) {
          console.error(
            `Tenant analytics failed: ${tenant._id}`,
            error
          );
        }
      }

      console.log("Analytics aggregation completed.");
    } catch (error) {
      console.error(
        "Analytics scheduler failed",
        error
      );
    }
  });
}