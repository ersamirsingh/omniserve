import { Types } from "mongoose";
import mongoose from "mongoose";

export interface ResolvedContext {
  tenantId: Types.ObjectId;
  outletId: Types.ObjectId;
}

export async function resolveDiningContext(
  req: any
): Promise<ResolvedContext> {
  const tenantIdStr = String(
    req.user?.tenantId ||
    req.query.tenantId ||
    req.body?.tenantId ||
    req.headers["x-tenant-id"] ||
    ""
  );
  
  const outletIdStr = String(
    req.user?.outletId ||
    req.query.outletId ||
    req.body?.outletId ||
    req.headers["x-outlet-id"] ||
    ""
  );

  if (!tenantIdStr || !Types.ObjectId.isValid(tenantIdStr)) {
    throw new Error("Invalid or missing Tenant ID");
  }
  const tenantId = new Types.ObjectId(tenantIdStr);

  let outletId: Types.ObjectId;
  if (outletIdStr && Types.ObjectId.isValid(outletIdStr)) {
    outletId = new Types.ObjectId(outletIdStr);
  } else {
    // Fallback: Query the first outlet for this tenant in the database
    const Outlet = mongoose.model("Outlet");
    const firstOutlet = await Outlet.findOne({ tenantId, isDeleted: false })
      .select("_id")
      .lean();
      
    if (!firstOutlet) {
      throw new Error(`No active outlets found for tenant ${tenantIdStr}`);
    }
    outletId = (firstOutlet as any)._id as Types.ObjectId;
  }

  return { tenantId, outletId };
}
