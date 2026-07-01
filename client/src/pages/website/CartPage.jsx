import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getCartApi, updateCartApi, removeFromCartApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

export default function CartPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(null);
  const [error, setError] = useState(null);
  const [updatingItemId, setUpdatingItemId] = useState(null);

  const fetchCart = () => {
    setLoading(true);
    getCartApi()
      .then((res) => {
        setCart(res.data.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load cart");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQty = async (item, delta) => {
    if (!cart) return;
    const newQty = item.quantity + delta;
    setUpdatingItemId(`${item.menuItemId._id || item.menuItemId}-${item.variantId?._id || ""}`);

    try {
      const res = await updateCartApi(cart._id, {
        item: {
          menuItemId: item.menuItemId._id || item.menuItemId,
          variantId: item.variantId?._id || undefined,
          quantity: newQty,
          notes: item.notes || undefined,
        },
      });
      setCart(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update item quantity");
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveItem = async (item) => {
    if (!cart) return;
    setUpdatingItemId(`${item.menuItemId._id || item.menuItemId}-${item.variantId?._id || ""}`);

    try {
      const res = await removeFromCartApi(
        cart._id,
        item.menuItemId._id || item.menuItemId,
        item.variantId?._id ? { variantId: item.variantId._id } : {}
      );
      setCart(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove item from cart");
    } finally {
      setUpdatingItemId(null);
    }
  };

  if (loading && !cart) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <Spinner size="lg" />
      </div>
    );
  }

  const items = cart?.items || [];

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
  const deliveryFee = subtotal > 0 ? 50 : 0;
  const totalAmount = subtotal + tax + deliveryFee;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/public/w/${outletSlug}`} className="text-zinc-400 hover:text-white transition-all text-sm font-semibold flex items-center gap-2">
            ← Back to Menu
          </Link>
        </div>
        <h1 className="font-bold text-lg text-white">Your Shopping Cart</h1>
        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <div className="flex-grow max-w-4xl w-full mx-auto p-6 flex flex-col md:flex-row gap-6">
        {/* Cart items list */}
        <div className="flex-1 flex flex-col gap-4">
          {items.map((item) => {
            const menuItemName = item.menuItemId?.name || "Dishes";
            const variantName = item.variantId?.name || "";
            const itemPrice = item.variantId?.price || item.menuItemId?.price || 0;
            const key = `${item.menuItemId?._id || item.menuItemId}-${item.variantId?._id || ""}`;
            const isUpdating = updatingItemId === key;

            return (
              <Card
                key={key}
                className="bg-zinc-900 border-zinc-800 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl relative"
              >
                {isUpdating && (
                  <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                    <Spinner size="sm" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-white text-base">
                    {menuItemName} {variantName && <span className="text-zinc-400 font-normal">({variantName})</span>}
                  </h3>
                  <p className="text-sm font-bold text-indigo-400 mt-1">₹{itemPrice}</p>
                  
                  {/* Addons List */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-zinc-800 space-y-0.5">
                      {item.addons.map((a) => (
                        <p key={a.addonId?._id || a.addonId} className="text-xs text-zinc-400">
                          + {a.addonId?.name || "Addon"} (x{a.quantity}) : ₹{(a.addonId?.price || 0) * a.quantity}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-xs text-zinc-500 italic mt-2">
                      Note: "{item.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center">
                  {/* Quantity Actions */}
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                    <button
                      onClick={() => handleUpdateQty(item, -1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 font-bold rounded-lg transition-all"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm text-zinc-100 w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQty(item, 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 font-bold rounded-lg transition-all"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemoveItem(item)}
                    className="p-2 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 rounded-xl transition-all"
                    title="Remove item"
                  >
                    🗑️
                  </button>
                </div>
              </Card>
            );
          })}

          {items.length === 0 && (
            <div className="py-16 text-center text-zinc-500">
              <p className="mb-6">Your shopping cart is currently empty.</p>
              <Link to={`/public/w/${outletSlug}`}>
                <Button variant="primary">Browse Menu</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Pricing Summary Sidepanel */}
        {items.length > 0 && (
          <div className="w-full md:w-80 shrink-0">
            <Card className="bg-zinc-900 border-zinc-800 p-5 rounded-2xl space-y-4">
              <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3">Bill Details</h2>
              <div className="space-y-2 text-sm text-zinc-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
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
                <div className="flex justify-between border-t border-zinc-800 pt-3 font-bold text-base text-white">
                  <span>To Pay</span>
                  <span className="text-indigo-400">₹{totalAmount}</span>
                </div>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => navigate(`/public/w/${outletSlug}/checkout`)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all text-sm"
                >
                  Proceed to Checkout
                </button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
