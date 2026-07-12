import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  getCartApi, 
  updateCartApi, 
  removeFromCartApi,
  createOrUpdateCartApi,
  getPublicMenuApi,
  listOutletCouponsApi,
  validateCouponApi,
  checkoutCartApi
} from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Card from "../../components/ui/Card";
import VariantCustomizerSheet from "../../components/guest/VariantCustomizerSheet";
import { 
  HiOutlineChevronLeft, 
  HiOutlineShoppingBag, 
  HiOutlineTag, 
  HiOutlineReceiptPercent,
  HiOutlineSparkles,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
  HiOutlineClock
} from "react-icons/hi2";

export default function CartPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(null);
  const [menuData, setMenuData] = useState(null);
  const [error, setError] = useState(null);
  const [updatingItemId, setUpdatingItemId] = useState(null);

  // Customizer sheet state
  const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
  const [itemVariants, setItemVariants] = useState([]);
  const [itemAddons, setItemAddons] = useState([]);
  const [editingCartItem, setEditingCartItem] = useState(null);

  // Cooking instructions
  const [cookingInstructions, setCookingInstructions] = useState("");

  // Tips Selection
  const [selectedTip, setSelectedTip] = useState(0); // 0 | 20 | 50 | 100 | 'custom'
  const [customTip, setCustomTip] = useState("");

  // Coupons
  const [coupons, setCoupons] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [showCouponsModal, setShowCouponsModal] = useState(false);

  // Order placement loading state
  const [placingOrder, setPlacingOrder] = useState(false);

  const guestSessionToken = localStorage.getItem("guestSessionToken");

  const fetchCartAndMenu = async () => {
    setLoading(true);
    try {
      const [cartRes, menuRes] = await Promise.all([
        getCartApi(),
        getPublicMenuApi(outletSlug)
      ]);
      setCart(cartRes.data.data);
      setMenuData(menuRes.data.data);
      
      // Load available coupons
      const couponsRes = await listOutletCouponsApi(outletSlug);
      setCoupons(couponsRes.data.data || []);
      
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load cart information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartAndMenu();
  }, [outletSlug]);

  // Stepper updates
  const handleUpdateQty = async (item, delta) => {
    if (!cart) return;
    const newQty = item.quantity + delta;
    const key = `${item.menuItemId._id || item.menuItemId}-${item.variantId?._id || ""}`;
    setUpdatingItemId(key);

    try {
      if (newQty <= 0) {
        const res = await removeFromCartApi(
          cart._id,
          item.menuItemId._id || item.menuItemId,
          item.variantId?._id ? { variantId: item.variantId._id } : {}
        );
        setCart(res.data.data);
      } else {
        const res = await updateCartApi(cart._id, {
          item: {
            menuItemId: item.menuItemId._id || item.menuItemId,
            variantId: item.variantId?._id || undefined,
            quantity: newQty,
            notes: item.notes || undefined,
          },
        });
        setCart(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update quantity");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (item) => {
    if (!cart) return;
    const key = `${item.menuItemId._id || item.menuItemId}-${item.variantId?._id || ""}`;
    setUpdatingItemId(key);

    try {
      const res = await removeFromCartApi(
        cart._id,
        item.menuItemId._id || item.menuItemId,
        item.variantId?._id ? { variantId: item.variantId._id } : {}
      );
      setCart(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove item");
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Editing variant/addons directly from the cart
  const handleEditItemConfig = (cartItem) => {
    if (!menuData) return;
    const menuItem = menuData.menuItems.find(mi => mi._id === (cartItem.menuItemId._id || cartItem.menuItemId));
    if (!menuItem) return;

    const activeVariants = menuData.variants.filter((v) => v.menuItemId === menuItem._id);
    const activeAddons = menuData.addons.filter((a) => a.menuItemId === menuItem._id);

    setItemVariants(activeVariants);
    setItemAddons(activeAddons);
    setSelectedItemForEdit(menuItem);
    setEditingCartItem(cartItem);
  };

  const handleConfirmEditCustomizer = async (config) => {
    if (!editingCartItem || !cart) return;
    setUpdatingItemId(`${editingCartItem.menuItemId._id || editingCartItem.menuItemId}-${editingCartItem.variantId?._id || ""}`);

    try {
      // 1. Remove the old configuration
      await removeFromCartApi(
        cart._id,
        editingCartItem.menuItemId._id || editingCartItem.menuItemId,
        editingCartItem.variantId?._id ? { variantId: editingCartItem.variantId._id } : {}
      );

      // 2. Add the new configuration
      const res = await createOrUpdateCartApi({
        sessionToken: guestSessionToken,
        outletId: menuData.outlet.id,
        item: {
          menuItemId: selectedItemForEdit._id,
          variantId: config.variantId,
          addons: config.addons,
          quantity: config.quantity,
          notes: config.notes || undefined
        }
      });
      setCart(res.data.data);
      setSelectedItemForEdit(null);
      setEditingCartItem(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save item customization");
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Coupon handling
  const handleApplyCoupon = async (code = null) => {
    const targetCode = code || couponCode;
    if (!targetCode.trim()) return;

    setCouponError("");
    try {
      const res = await validateCouponApi(outletSlug, targetCode.trim(), itemSubtotal);
      setAppliedCoupon(res.data.data);
      setCouponCode("");
      setShowCouponsModal(false);
    } catch (err) {
      setCouponError(err.response?.data?.message || "Invalid coupon code");
      setAppliedCoupon(null);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
  };

  // Pricing calculations
  const itemSubtotal = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => {
      const itemPrice = item.variantId?.price || item.menuItemId?.price || 0;
      const addonsPrice = (item.addons || []).reduce((acc, ad) => acc + (ad.addonId?.price || ad.price || 0) * (ad.quantity || 1), 0);
      return sum + (itemPrice + addonsPrice) * item.quantity;
    }, 0);
  }, [cart]);

  const discountValue = useMemo(() => {
    if (!appliedCoupon) return 0;
    return appliedCoupon.discount || 0;
  }, [appliedCoupon]);

  const taxAmount = useMemo(() => {
    return Number(((itemSubtotal - discountValue) * 0.05).toFixed(2));
  }, [itemSubtotal, discountValue]);

  const tipAmount = useMemo(() => {
    if (selectedTip === "custom") {
      return Number(customTip) || 0;
    }
    return selectedTip;
  }, [selectedTip, customTip]);

  const packagingCharges = 15; // mock packaging / service charge

  const grandTotal = useMemo(() => {
    const total = itemSubtotal - discountValue + taxAmount + packagingCharges + tipAmount;
    return Math.max(0, Number(total.toFixed(2)));
  }, [itemSubtotal, discountValue, taxAmount, tipAmount]);

  // Place order checkout submission
  const handlePlaceOrder = async () => {
    if (!cart || cart.items.length === 0) return;
    setPlacingOrder(true);

    const payload = {
      cartId: cart._id,
      customer: {
        name: menuData?.guestSession?.name || "Guest",
        phone: menuData?.guestSession?.phone || "9999999999"
      },
      fulfillment: {
        type: "DINE_IN",
        instructions: `Table ${menuData?.table?.tableNumber || "N/A"}. Note: ${cookingInstructions}`
      },
      payment: {
        mode: "COD"
      },
      couponCode: appliedCoupon?.code || undefined
    };

    try {
      const res = await checkoutCartApi(payload);
      const data = res.data.data;
      
      // Redirect to success screen
      navigate(`/public/w/${outletSlug}/order-success?orderId=${data.processedOrder.internalOrderId}`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-900 guest-ordering">
        <Spinner size="lg" className="text-[#6311f4]" />
      </div>
    );
  }

  if (error || !menuData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-zinc-950 p-6 text-center space-y-4 guest-ordering">
        <h2 className="text-xl font-black text-rose-500">Failed to Load Cart</h2>
        <p className="text-zinc-500 text-xs max-w-xs">{error || "Something went wrong"}</p>
        <button
          onClick={() => navigate(`/public/w/${outletSlug}`)}
          className="px-6 py-2.5 bg-[#6311f4] text-white font-bold rounded-xl text-xs uppercase"
        >
          Back to Menu
        </button>
      </div>
    );
  }

  const items = cart?.items || [];
  const { outlet, table, diningArea, guestSession } = menuData;

  // Empty cart visual
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-white text-zinc-950 flex flex-col items-center justify-center p-6 text-center space-y-6 guest-ordering">
        <div className="w-20 h-20 bg-zinc-50 border border-zinc-100 rounded-full flex items-center justify-center text-[#6311f4]/40 text-4xl">
          <HiOutlineShoppingBag />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-zinc-900 tracking-tight">Your Cart is Empty</h2>
          <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
            Scan some delicious dishes from our digital menu and add them to your cart.
          </p>
        </div>
        <Link 
          to={`/public/w/${outletSlug}/menu`}
          className="px-6 py-3.5 bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-95 transition-all"
        >
          Browse Menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 flex flex-col guest-ordering pb-24">
      {/* Top sticky header */}
      <header className="bg-white border-b border-zinc-100/80 sticky top-0 z-40 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <Link 
          to={`/public/w/${outletSlug}/menu`}
          className="w-9 h-9 bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 rounded-xl flex items-center justify-center text-zinc-600 transition"
        >
          <HiOutlineChevronLeft className="w-5 h-5" />
        </Link>
        <div className="text-center">
          <h1 className="font-black text-[14px] text-zinc-900 tracking-tight">Cart Review</h1>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Table {table?.tableNumber} • {diningArea?.name}</p>
        </div>
        <div className="w-9"></div>
      </header>

      {/* Main container */}
      <div className="flex-grow max-w-xl w-full mx-auto p-4 space-y-4">
        
        {/* Diner Identification details */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Ordering as</span>
            <h3 className="font-extrabold text-sm text-zinc-900">{guestSession?.name || "Guest"}</h3>
          </div>
          <span className="bg-[#6311f4]/5 border border-[#6311f4]/10 text-[#6311f4] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">
            {guestSession?.role || "MEMBER"}
          </span>
        </div>

        {/* Dynamic Items list */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-4">
          <h3 className="font-black text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">Items Summary</h3>
          <div className="divide-y divide-zinc-50 space-y-4">
            {items.map((item) => {
              const menuItem = item.menuItemId || {};
              const variantName = item.variantId?.name || "";
              const itemPrice = item.variantId?.price || menuItem.price || 0;
              
              let addonsTotal = 0;
              const addonsList = (item.addons || []).map((a) => {
                const addPrice = a.addonId?.price || a.price || 0;
                addonsTotal += addPrice * a.quantity;
                return `${a.addonId?.name || "Addon"} (x${a.quantity})`;
              });

              const lineTotal = (itemPrice + addonsTotal) * item.quantity;
              const key = `${menuItem._id || item.menuItemId}-${item.variantId?._id || ""}`;
              const isUpdating = updatingItemId === key;

              return (
                <div key={key} className="pt-4 first:pt-0 flex justify-between items-start gap-4 relative">
                  {isUpdating && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
                      <Spinner size="sm" className="text-[#6311f4]" />
                    </div>
                  )}

                  <div className="flex-1 space-y-1">
                    <div className="flex items-start gap-2">
                      <div className={menuItem.isVeg ? 'veg-dot mt-0.5' : 'nonveg-dot mt-0.5'}>
                        <div className={`w-1.5 h-1.5 rounded-full ${menuItem.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-zinc-900">
                          {menuItem.name} {variantName && <span className="text-zinc-500 font-normal">({variantName})</span>}
                        </h4>
                        <span className="text-xs font-black text-zinc-900">₹{itemPrice + addonsTotal}</span>
                      </div>
                    </div>

                    {/* Addons summary */}
                    {addonsList.length > 0 && (
                      <p className="text-[10px] text-zinc-400 pl-4.5 leading-relaxed">
                        + {addonsList.join(", ")}
                      </p>
                    )}

                    {/* Special instruction notes */}
                    {item.notes && (
                      <p className="text-[10px] text-[#6311f4] italic pl-4.5 font-bold">
                        Note: "{item.notes}"
                      </p>
                    )}

                    {/* Edit customization link */}
                    <button
                      onClick={() => handleEditItemConfig(item)}
                      className="text-[10px] text-[#6311f4] font-black uppercase tracking-wider pl-4.5 block mt-1 hover:underline cursor-pointer"
                    >
                      Customize item
                    </button>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-100 rounded-lg p-0.5">
                      <button
                        onClick={() => handleUpdateQty(item, -1)}
                        className="w-6 h-6 flex items-center justify-center text-zinc-500 font-bold hover:bg-zinc-100 rounded cursor-pointer"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-xs text-zinc-900 w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQty(item, 1)}
                        className="w-6 h-6 flex items-center justify-center text-zinc-500 font-bold hover:bg-zinc-100 rounded cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs font-black text-zinc-900">₹{lineTotal}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Special Cooking Instructions textarea */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-2">
          <h3 className="font-black text-xs text-zinc-400 uppercase tracking-wider">Cooking Instructions</h3>
          <textarea
            rows="2"
            placeholder="Less Spicy, No Onion, Extra Cheese, etc."
            value={cookingInstructions}
            onChange={(e) => setCookingInstructions(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-100 text-zinc-900 placeholder-zinc-400 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6311f4]/30 resize-none"
          />
        </div>

        {/* Coupons Promo sections */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-3">
          <h3 className="font-black text-xs text-zinc-400 uppercase tracking-wider">Offers & Coupons</h3>
          
          {appliedCoupon ? (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HiOutlineCheckCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-xs font-black text-emerald-700">Coupon "{appliedCoupon.code}" Applied</p>
                  <p className="text-[10px] text-emerald-600 font-bold">Saved ₹{appliedCoupon.discount} on order</p>
                </div>
              </div>
              <button
                onClick={handleRemoveCoupon}
                className="text-[10px] text-rose-500 font-black uppercase tracking-wider hover:underline cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <div 
              onClick={() => setShowCouponsModal(true)}
              className="border border-dashed border-zinc-200 rounded-xl p-3 flex items-center justify-between hover:bg-zinc-50 cursor-pointer transition-all"
            >
              <div className="flex items-center gap-2">
                <HiOutlineTag className="w-5 h-5 text-[#6311f4]" />
                <span className="text-xs font-extrabold text-zinc-700">Apply Coupon / View Offers</span>
              </div>
              <span className="text-[#6311f4] text-[18px]">👉</span>
            </div>
          )}
        </div>

        {/* Tip the kitchen staff selection */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-3">
          <div className="flex items-center gap-1">
            <span className="text-[18px]">🍕</span>
            <div>
              <h3 className="font-extrabold text-xs text-zinc-900 tracking-tight">Tip the Kitchen Team</h3>
              <p className="text-[9px] text-zinc-400">100% of the tips are distributed directly to kitchen workers.</p>
            </div>
          </div>

          <div className="flex gap-2">
            {[
              { val: 20, label: "₹20" },
              { val: 50, label: "₹50" },
              { val: 100, label: "₹100" }
            ].map((tp) => (
              <button
                key={tp.val}
                onClick={() => setSelectedTip(selectedTip === tp.val ? 0 : tp.val)}
                className={`flex-1 py-2 text-xs font-extrabold border rounded-xl transition ${
                  selectedTip === tp.val 
                    ? "bg-[#6311f4]/10 border-[#6311f4]/20 text-[#6311f4]" 
                    : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200"
                }`}
              >
                {tp.label}
              </button>
            ))}
            <button
              onClick={() => setSelectedTip(selectedTip === "custom" ? 0 : "custom")}
              className={`flex-1 py-2 text-xs font-extrabold border rounded-xl transition ${
                selectedTip === "custom" 
                  ? "bg-[#6311f4]/10 border-[#6311f4]/20 text-[#6311f4]" 
                  : "bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200"
              }`}
            >
              Custom
            </button>
          </div>

          {selectedTip === "custom" && (
            <div className="relative mt-2">
              <input
                type="number"
                placeholder="Enter custom tip amount (₹)"
                value={customTip}
                onChange={(e) => setCustomTip(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-100 text-zinc-900 placeholder-zinc-400 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#6311f4]/35"
              />
            </div>
          )}
        </div>

        {/* Preparation ETA Badge */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <HiOutlineClock className="w-5 h-5 text-[#6311f4]" />
          <div>
            <h4 className="font-extrabold text-xs text-zinc-800">Average Preparation Time</h4>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">20-25 mins • Dine-In delivery</p>
          </div>
        </div>

        {/* Billing Invoice Breakdown details */}
        <div className="bg-white border border-zinc-100 rounded-2xl shadow-xs p-4 space-y-3">
          <h3 className="font-black text-xs text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-2">Bill Details</h3>
          <div className="space-y-2 text-xs text-zinc-600 font-bold">
            <div className="flex justify-between">
              <span>Item Subtotal</span>
              <span className="text-zinc-900">₹{itemSubtotal}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Coupon Discount</span>
                <span>-₹{discountValue}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>GST/Taxes (5%)</span>
              <span className="text-zinc-900">₹{taxAmount}</span>
            </div>
            <div className="flex justify-between">
              <span>Restaurant Service/Packing Charge</span>
              <span className="text-zinc-900">₹{packagingCharges}</span>
            </div>
            {tipAmount > 0 && (
              <div className="flex justify-between text-[#6311f4]">
                <span>Kitchen Tip Contribution</span>
                <span>₹{tipAmount}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-zinc-100 pt-3 font-black text-sm text-zinc-900">
              <span>Grand Total</span>
              <span className="text-[#6311f4] text-base">₹{grandTotal}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Coupons bottom modal */}
      {showCouponsModal && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl p-5 w-full max-w-md max-h-[70vh] overflow-y-auto space-y-4 animate-slide-up">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-black text-sm text-zinc-900 tracking-tight">Available Offers & Coupons</h3>
              <button 
                onClick={() => setShowCouponsModal(false)}
                className="text-xs text-zinc-400 font-bold uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </div>

            {couponError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-3 rounded-xl flex items-center gap-1.5">
                <HiOutlineExclamationCircle className="w-4 h-4 shrink-0" />
                <span>{couponError}</span>
              </div>
            )}

            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div key={coupon._id} className="border border-zinc-100 rounded-xl p-3 flex flex-col gap-2 hover:bg-zinc-50 transition">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#6311f4]/5 border border-[#6311f4]/25 text-[#6311f4] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                      {coupon.code}
                    </span>
                    <button
                      onClick={() => handleApplyCoupon(coupon.code)}
                      className="text-[10px] text-[#6311f4] font-black uppercase tracking-wider hover:underline cursor-pointer"
                    >
                      Apply Offer
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-zinc-900">{coupon.description || "Special Discount"}</h4>
                    <p className="text-[9px] text-zinc-400 mt-0.5">Expires: {new Date(coupon.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}

              {coupons.length === 0 && (
                <p className="text-center py-6 text-xs text-zinc-400 font-bold">No coupons currently available for this outlet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Variant customizer pop-up */}
      {selectedItemForEdit && (
        <VariantCustomizerSheet
          isOpen={!!selectedItemForEdit}
          onClose={() => {
            setSelectedItemForEdit(null);
            setEditingCartItem(null);
          }}
          item={selectedItemForEdit}
          variants={itemVariants}
          addons={itemAddons}
          onConfirm={handleConfirmEditCustomizer}
          confirmLoading={false}
        />
      )}

      {/* Sticky Bottom Place Order CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 p-4 z-40 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total Payable</p>
            <p className="text-base font-black text-[#6311f4]">₹{grandTotal}</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={placingOrder}
            className="flex-1 bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-widest py-3.5 px-6 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-97 transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
          >
            {placingOrder ? "Placing Order..." : "Place Order →"}
          </button>
        </div>
      </div>
    </div>
  );
}
