import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getCartApi, checkoutCartApi, validateCouponApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

const formatINR = (amount) => {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function CheckoutPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  const hasTableSession =
    !!localStorage.getItem("sessionToken") && !localStorage.getItem("sessionToken").startsWith("WEB-SESS-");

  // Form states
  const [customerName, setCustomerName] = useState(() => localStorage.getItem("guestName") || "");
  const [customerPhone, setCustomerPhone] = useState(() => localStorage.getItem("guestPhone") || "");
  const [customerEmail, setCustomerEmail] = useState(() => localStorage.getItem("guestEmail") || "");
  const [sessionBill, setSessionBill] = useState(null);

  const [fulfillmentType, setFulfillmentType] = useState(hasTableSession ? "DINE_IN" : "DELIVERY");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPincode, setAddressPincode] = useState("");
  const [deliveryInstructions, setDeliveryInstructions] = useState("");

  const [paymentMode, setPaymentMode] = useState("COD");

  // Coupon states
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponError, setCouponError] = useState(null);
  const [couponSuccess, setCouponSuccess] = useState(null);

  useEffect(() => {
    getCartApi()
      .then((res) => {
        setCart(res.data.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load checkout details");
      })
      .finally(() => {
        setLoading(false);
      });

    // If on active table session, load previous orders session bill for cumulative total
    const sessionToken = localStorage.getItem("sessionToken");
    if (sessionToken && !sessionToken.startsWith("WEB-SESS-")) {
      import("../../api/models/public.api").then(({ getQrSessionBillApi }) => {
        getQrSessionBillApi(sessionToken)
          .then((res) => {
            setSessionBill(res.data?.data?.billSession || null);
          })
          .catch(() => {});
      });
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <Spinner size="lg" />
      </div>
    );
  }

  const items = cart?.items || [];
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-background p-6 font-sans">
        <h2 className="text-xl font-semibold mb-3 font-hanken">No Active Cart</h2>
        <p className="text-on-surface-variant mb-7 text-center max-w-xs">
          Your cart is empty. Please add items before checking out.
        </p>
        <Link to={`/public/w/${outletSlug}`}>
          <Button variant="primary" className="bg-primary-fixed hover:brightness-95 text-on-primary-fixed border-none font-semibold">
            Browse Menu
          </Button>
        </Link>
      </div>
    );
  }

  // Calculate pricing
  let subtotal = 0;
  items.forEach((item) => {
    let itemPrice = item.menuItemId?.price || 0;
    if (item.variantId) {
      itemPrice = item.variantId.price || 0;
    }
    let addonsTotal = 0;
    (item.addons || []).forEach((addon) => {
      addonsTotal += (addon.addonId?.price || 0) * (addon.quantity || 1);
    });
    subtotal += (itemPrice + addonsTotal) * item.quantity;
  });

  const tax = Number((subtotal * 0.05).toFixed(2));
  const deliveryFee = fulfillmentType === "DELIVERY" ? 50 : 0;
  const totalAmount = Math.max(0, Number((subtotal + tax + deliveryFee - couponDiscount).toFixed(2)));

  const fulfillmentOptions = hasTableSession
    ? [{ value: "DINE_IN", label: "Dine In (This Table)" }]
    : [
        { value: "DELIVERY", label: "Home Delivery" },
        { value: "TAKEAWAY", label: "Takeaway / Self-Pickup" },
      ];

  const handleApplyCoupon = async (e) => {
    if (e) e.preventDefault();
    if (!couponInput.trim()) {
      setCouponError("Please enter a coupon code.");
      return;
    }

    setValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res = await validateCouponApi(outletSlug, couponInput.trim().toUpperCase(), subtotal);
      const { code, discount } = res.data.data;
      setAppliedCoupon(code);
      setCouponDiscount(discount);
      setCouponSuccess(`Coupon "${code}" applied successfully! You saved ₹${discount.toFixed(2)}.`);
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon code");
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponSuccess(null);
    setCouponError(null);
    setCouponInput("");
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!customerName || !customerPhone) {
      alert("Name and Phone number are required.");
      return;
    }

    if (fulfillmentType === "DELIVERY" && (!addressLine1 || !addressCity || !addressState || !addressPincode)) {
      alert("Delivery address details are required.");
      return;
    }

    setCheckingOut(true);



    // Extract UTM attributes
    const query = new URLSearchParams(window.location.search);
    const utmSource = query.get("utm_source") || "";
    const utmMedium = query.get("utm_medium") || "";
    const utmCampaign = query.get("utm_campaign") || "";
    const referrer = document.referrer || "";

    const payload = {
      cartId: cart._id,
      couponCode: appliedCoupon || undefined,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail || undefined,
      },
      fulfillment: {
        type: fulfillmentType,
        instructions: deliveryInstructions || undefined,
        address:
          fulfillmentType === "DELIVERY"
            ? {
                line1: addressLine1,
                line2: addressLine2 || undefined,
                city: addressCity,
                state: addressState,
                pincode: addressPincode,
              }
            : undefined,
      },
      payment: {
        mode: paymentMode,
        status: paymentMode === "COD" ? "PENDING" : "SUCCESS",
        transactionId: paymentMode === "ONLINE" ? `TXN-${Date.now()}` : undefined,
      },
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
    };

    try {
      const res = await checkoutCartApi(payload);
      const orderId = res.data.data.processedOrder.internalOrderId;

      // Save guest info for subsequent orders in the same session
      localStorage.setItem("guestName", customerName);
      localStorage.setItem("guestPhone", customerPhone);
      if (customerEmail) {
        localStorage.setItem("guestEmail", customerEmail);
      }

      // Clear session timer lock since they have placed an order and occupied the table
      localStorage.removeItem("lockExpiresAt");

      // Clear sessionToken only if not a dine-in QR session order
      if (fulfillmentType !== "DINE_IN") {
        localStorage.removeItem("sessionToken");
      }

      navigate(`/public/w/${outletSlug}/order-success?orderId=${orderId}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to place order");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border-base bg-background/90 backdrop-blur sticky top-0 z-40 px-5 py-4 flex items-center justify-between">
        <Link
          to={`/public/w/${outletSlug}/cart`}
          className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-semibold flex items-center gap-2"
        >
          ← Back to Cart
        </Link>
        <h1 className="font-semibold text-lg text-on-background font-hanken">Secure Checkout</h1>
        <div className="w-24" />
      </header>

      {/* Checkout Form Container */}
      <form onSubmit={handleCheckout} className="flex-grow max-w-5xl w-full mx-auto p-5 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {/* Customer Details */}
          <Card className="bg-surface-container border border-border-base p-5 rounded-2xl space-y-4">
            <h2 className="text-base font-semibold text-on-background font-hanken border-b border-border-base pb-3">
              1. Contact Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Full Name *
                </label>
                <Input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Rahul Singh"
                  className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Phone Number *
                </label>
                <Input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                  className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Email Address (Optional)
                </label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                />
              </div>
            </div>
          </Card>

          {/* Fulfillment details */}
          <Card className="bg-surface-container border border-border-base p-5 rounded-2xl space-y-4">
            <h2 className="text-base font-semibold text-on-background font-hanken border-b border-border-base pb-3">
              2. {hasTableSession ? "Dine-In Order" : "Delivery or Takeaway"}
            </h2>
            {!hasTableSession && (
              <div>
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">
                  Select Option
                </label>
                <Select
                  value={fulfillmentType}
                  onChange={(e) => setFulfillmentType(e.target.value)}
                  options={fulfillmentOptions}
                  className="bg-surface-container-low border-border-base text-on-surface rounded-xl"
                />
              </div>
            )}
            {hasTableSession && (
              <p className="text-sm text-on-surface-variant">
                Your order will be served directly to your table. No delivery details needed.
              </p>
            )}

            {fulfillmentType === "DELIVERY" && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                    Flat / House No. / Building Name *
                  </label>
                  <Input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Flat 302, Green Meadows"
                    className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                    Street / Locality / Area
                  </label>
                  <Input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Arera Colony"
                    className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                      City *
                    </label>
                    <Input
                      type="text"
                      required
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="Bhopal"
                      className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                      State *
                    </label>
                    <Input
                      type="text"
                      required
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      placeholder="MP"
                      className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                      Pincode *
                    </label>
                    <Input
                      type="text"
                      required
                      value={addressPincode}
                      onChange={(e) => setAddressPincode(e.target.value)}
                      placeholder="462001"
                      className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                    Rider Instructions
                  </label>
                  <Input
                    type="text"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Leave it at the gate / Call before arrival"
                    className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                  />
                </div>
              </div>
            )}

            {fulfillmentType === "TAKEAWAY" && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                  Notes for the kitchen (optional)
                </label>
                <Input
                  type="text"
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Pack it in two boxes / no cutlery, etc."
                  className="bg-surface-container-low border-border-base text-on-surface focus:border-primary rounded-xl"
                />
              </div>
            )}
          </Card>

          {/* Payment Method */}
          <Card className="bg-surface-container border border-border-base p-5 rounded-2xl space-y-4">
            <h2 className="text-base font-semibold text-on-background font-hanken border-b border-border-base pb-3">
              3. Payment Method
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                  paymentMode === "COD"
                    ? "bg-primary/10 border-primary"
                    : "bg-surface-container-low border-border-base hover:border-on-surface-variant/40 text-on-surface"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="COD"
                  checked={paymentMode === "COD"}
                  onChange={() => setPaymentMode("COD")}
                  className="w-4 h-4 accent-primary"
                />
                <div>
                  <p className="text-sm font-semibold text-on-surface">Cash on Delivery (COD)</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Pay with cash upon arrival</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${
                  paymentMode === "ONLINE"
                    ? "bg-primary/10 border-primary"
                    : "bg-surface-container-low border-border-base hover:border-on-surface-variant/40 text-on-surface"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="ONLINE"
                  checked={paymentMode === "ONLINE"}
                  onChange={() => setPaymentMode("ONLINE")}
                  className="w-4 h-4 accent-primary"
                />
                <div>
                  <p className="text-sm font-semibold text-on-surface">Mock Net Banking / Cards</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">Simulate instant online payment</p>
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* Order review sidebar */}
        <div className="w-full md:w-[22rem] shrink-0">
          <Card className="bg-surface-container border border-border-base p-5 rounded-2xl space-y-4 sticky top-24">
            <h2 className="text-base font-semibold text-on-background font-hanken border-b border-border-base pb-3">
              Order Review
            </h2>

            {/* Items summary */}
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
              {items.map((item) => {
                const menuItemName = item.menuItemId?.name || "Dish";
                const variantName = item.variantId?.name || "";
                const itemPrice = item.variantId?.price || item.menuItemId?.price || 0;

                let addonsTotal = 0;
                (item.addons || []).forEach((addon) => {
                  addonsTotal += (addon.addonId?.price || 0) * addon.quantity;
                });
                const totalItemPrice = (itemPrice + addonsTotal) * item.quantity;

                return (
                  <div key={item.menuItemId?._id || item.menuItemId} className="flex justify-between text-xs text-on-surface">
                    <div>
                      <p className="font-semibold text-on-surface">
                        {menuItemName} {variantName && `(${variantName})`}{" "}
                        <span className="text-on-surface-variant text-xs">x{item.quantity}</span>
                      </p>
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-on-surface-variant text-[10px] pl-1.5 mt-0.5">
                          + {item.addons.map((a) => a.addonId?.name || "Addon").join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="font-bold tabular-nums">{formatINR(totalItemPrice)}</span>
                  </div>
                );
              })}
            </div>

            {/* Coupon application container */}
            <div className="border-t border-border-base pt-3.5 space-y-2">
              <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block">
                Promo Coupon
              </label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-primary/10 border border-primary/30 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-primary">
                    🎟️ {appliedCoupon}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-error font-bold hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      setCouponError(null);
                      setCouponSuccess(null);
                    }}
                    placeholder="e.g. SAVE50"
                    className="flex-1 bg-surface-container-low border border-border-base text-on-surface rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-primary placeholder:text-on-surface-variant/60"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={validatingCoupon}
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 text-xs bg-primary-fixed hover:brightness-95 text-on-primary-fixed border-none"
                  >
                    Apply
                  </Button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-error font-medium pl-1 animate-fade-in">{couponError}</p>}
              {couponSuccess && (
                <p className="text-[10px] text-success-green font-medium pl-1 animate-fade-in">{couponSuccess}</p>
              )}
            </div>

            {/* Receipt calculation details */}
            <div className="space-y-2 border-t border-border-base pt-3.5 text-xs text-on-surface-variant">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="text-on-surface tabular-nums">{formatINR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST/Taxes (5%)</span>
                <span className="text-on-surface tabular-nums">{formatINR(tax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="text-on-surface tabular-nums">{formatINR(deliveryFee)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-success-green font-semibold animate-fade-in">
                  <span>Coupon Discount</span>
                  <span>-{formatINR(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border-base pt-3 font-bold text-base text-on-background">
                <span>Total Payable</span>
                <span className="text-primary tabular-nums">{formatINR(totalAmount)}</span>
              </div>

              {/* Running Cumulative Session Bill if adding items in active table session */}
              {sessionBill && ((sessionBill.subtotal || 0) > 0) && (
                <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-xl space-y-1.5 text-xs animate-fade-in">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-primary">Cumulative Session Summary</p>
                  <div className="flex justify-between text-on-surface font-medium">
                    <span>Previous Orders Total:</span>
                    <span className="tabular-nums">{formatINR((sessionBill.subtotal || 0) + (sessionBill.tax || 0))}</span>
                  </div>
                  <div className="flex justify-between text-on-surface font-medium">
                    <span>New Items Total:</span>
                    <span className="tabular-nums">{formatINR(totalAmount)}</span>
                  </div>
                  <div className="border-t border-primary/20 pt-1 flex justify-between font-black text-sm text-primary">
                    <span>Total Session Bill:</span>
                    <span className="tabular-nums">{formatINR((sessionBill.subtotal || 0) + (sessionBill.tax || 0) + totalAmount)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Submit checkout button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={checkingOut}
                className="w-full bg-primary-fixed hover:brightness-95 disabled:bg-surface-container-high disabled:text-on-surface-variant text-on-primary-fixed font-bold py-3 px-4 rounded-xl shadow-[0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand-accent)_35%,transparent)] transition-all text-sm flex items-center justify-center gap-2"
              >
                {checkingOut ? (
                  <>
                    <Spinner size="sm" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <span>Place Order ({formatINR(totalAmount)})</span>
                )}
              </button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}