import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getCartApi, checkoutCartApi } from "../../api/models/public.api";
import { validateCouponApi } from "../../api/models/coupon.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";

export default function CheckoutPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);
  const [checkingOut, setCheckingOut] = useState(false);

  // Form states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  
  const [fulfillmentType, setFulfillmentType] = useState(
    localStorage.getItem("sessionToken") ? "DINE_IN" : "DELIVERY"
  );
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
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <Spinner size="lg" />
      </div>
    );
  }

  const items = cart?.items || [];
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
        <h2 className="text-xl font-bold mb-4">No Active Cart</h2>
        <p className="text-zinc-400 mb-6">Your shopping cart is empty. Please add items before checking out.</p>
        <Link to={`/public/w/${outletSlug}`}>
          <Button variant="primary">Browse Menu</Button>
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

  const handleApplyCoupon = async (e) => {
    e?.preventDefault();
    if (!couponInput.trim()) return;
    setValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);
    try {
      const res = await validateCouponApi(outletSlug, couponInput.trim(), subtotal);
      if (res.data.data.isValid) {
        setAppliedCoupon(res.data.data.code);
        setCouponDiscount(res.data.data.discount);
        setCouponSuccess(`Coupon "${res.data.data.code}" applied! You saved ₹${res.data.data.discount}`);
        setCouponInput("");
      } else {
        setCouponError(res.data.data.reason || "Invalid coupon code");
        setAppliedCoupon(null);
        setCouponDiscount(0);
      }
    } catch (err) {
      setCouponError(err.response?.data?.message || "Failed to validate coupon");
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
        address: fulfillmentType === "DELIVERY" ? {
          line1: addressLine1,
          line2: addressLine2 || undefined,
          city: addressCity,
          state: addressState,
          pincode: addressPincode,
        } : undefined,
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/public/w/${outletSlug}/cart`} className="text-zinc-400 hover:text-white transition-all text-sm font-semibold flex items-center gap-2">
            ← Back to Cart
          </Link>
        </div>
        <h1 className="font-bold text-lg text-white">Secure Checkout</h1>
        <div className="w-20"></div>
      </header>

      {/* Checkout Form Container */}
      <form onSubmit={handleCheckout} className="flex-grow max-w-5xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          {/* Customer Details */}
          <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3">1. Contact Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Full Name *</label>
                <Input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Rahul Singh"
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Phone Number *</label>
                <Input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="9876543210"
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Email Address (Optional)</label>
                <Input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                />
              </div>
            </div>
          </Card>

          {/* Fulfillment details */}
          <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3">2. Delivery or Takeaway</h2>
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Select Option</label>
              <Select
                value={fulfillmentType}
                onChange={(e) => setFulfillmentType(e.target.value)}
                options={[
                  { value: "DELIVERY", label: "Home Delivery" },
                  { value: "TAKEAWAY", label: "Takeaway / Self-Pickup" }
                ]}
                className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
              />
            </div>

            {fulfillmentType === "DELIVERY" && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Flat / House No. / Building Name *</label>
                  <Input
                    type="text"
                    required
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Flat 302, Green Meadows"
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Street / Locality / Area</label>
                  <Input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Arera Colony"
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">City *</label>
                    <Input
                      type="text"
                      required
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      placeholder="Bhopal"
                      className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">State *</label>
                    <Input
                      type="text"
                      required
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      placeholder="MP"
                      className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Pincode *</label>
                    <Input
                      type="text"
                      required
                      value={addressPincode}
                      onChange={(e) => setAddressPincode(e.target.value)}
                      placeholder="462001"
                      className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Rider Instructions</label>
                  <Input
                    type="text"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Leave it at the gate / Call before arrival"
                    className="bg-zinc-950 border-zinc-800 text-zinc-200 rounded-xl"
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Payment Method */}
          <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl space-y-4">
            <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3">3. Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  paymentMode === "COD"
                    ? "bg-indigo-500/10 border-indigo-600"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="COD"
                  checked={paymentMode === "COD"}
                  onChange={() => setPaymentMode("COD")}
                  className="radio radio-xs radio-primary w-4 h-4 text-indigo-600 border-zinc-700 bg-zinc-800 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm font-bold text-white">Cash on Delivery (COD)</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Pay with cash upon arrival</p>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${
                  paymentMode === "ONLINE"
                    ? "bg-indigo-500/10 border-indigo-600"
                    : "bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="ONLINE"
                  checked={paymentMode === "ONLINE"}
                  onChange={() => setPaymentMode("ONLINE")}
                  className="radio radio-xs radio-primary w-4 h-4 text-indigo-600 border-zinc-700 bg-zinc-800 focus:ring-indigo-500"
                />
                <div>
                  <p className="text-sm font-bold text-white">Mock Net Banking / Cards</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Simulate instant online payment</p>
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* Order review sidebar */}
        <div className="w-full md:w-90 shrink-0">
          <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl space-y-4 sticky top-24">
            <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3">Order Review</h2>
            
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
                  <div key={item.menuItemId?._id || item.menuItemId} className="flex justify-between text-xs text-zinc-300">
                    <div>
                      <p className="font-semibold text-white">
                        {menuItemName} {variantName && `(${variantName})`} <span className="text-zinc-500 text-xs">x{item.quantity}</span>
                      </p>
                      {item.addons && item.addons.length > 0 && (
                        <p className="text-zinc-500 text-[10px] pl-1.5 mt-0.5">
                          + {item.addons.map(a => a.addonId?.name || "Addon").join(", ")}
                        </p>
                      )}
                    </div>
                    <span className="font-bold">₹{totalItemPrice}</span>
                  </div>
                );
              })}
            </div>

            {/* Coupon application container */}
            <div className="border-t border-zinc-800 pt-3.5 space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Promo Coupon</label>
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-2.5 bg-indigo-500/10 border border-indigo-550/30 rounded-xl animate-fade-in">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-indigo-400">
                    🎟️ {appliedCoupon}
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs text-red-400 font-bold hover:underline cursor-pointer"
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
                    className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-indigo-500 placeholder:text-zinc-700"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    loading={validatingCoupon}
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 text-xs"
                  >
                    Apply
                  </Button>
                </div>
              )}
              {couponError && <p className="text-[10px] text-red-500 font-medium pl-1 animate-fade-in">{couponError}</p>}
              {couponSuccess && <p className="text-[10px] text-emerald-500 font-medium pl-1 animate-fade-in">{couponSuccess}</p>}
            </div>

            {/* Receipt calculation details */}
            <div className="space-y-2 border-t border-zinc-800 pt-3.5 text-xs text-zinc-400">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="text-zinc-200">₹{subtotal}</span>
              </div>
              <div className="flex justify-between">
                <span>GST/Taxes (5%)</span>
                <span className="text-zinc-200">₹{tax}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="text-zinc-200">₹{deliveryFee}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-500 font-semibold animate-fade-in">
                  <span>Coupon Discount</span>
                  <span>-₹{couponDiscount}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-800 pt-3 font-bold text-base text-white">
                <span>Total Payable</span>
                <span className="text-indigo-400">₹{totalAmount}</span>
              </div>
            </div>

            {/* Submit checkout button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={checkingOut}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-sm flex items-center justify-center gap-2"
              >
                {checkingOut ? (
                  <>
                    <Spinner size="sm" />
                    <span>Placing Order...</span>
                  </>
                ) : (
                  <span>Place Order (₹{totalAmount})</span>
                )}
              </button>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
