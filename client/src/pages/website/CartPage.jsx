import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getCartApi, updateCartApi, removeFromCartApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";

const formatINR = (amount) => {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

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
    if (newQty < 1) return;
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
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-background p-6 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center text-2xl mb-5">
          ⚠️
        </div>
        <h2 className="text-xl font-semibold mb-2 font-hanken">Couldn't load your cart</h2>
        <p className="text-on-surface-variant text-sm mb-7 text-center max-w-xs">{error}</p>
        <Link to={`/public/w/${outletSlug}`}>
          <Button variant="primary" className="bg-primary-fixed hover:brightness-95 text-on-primary-fixed border-none font-semibold">
            Browse Menu
          </Button>
        </Link>
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
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border-base bg-background/90 backdrop-blur sticky top-0 z-40 px-5 py-4 flex items-center justify-between">
        <Link
          to={`/public/w/${outletSlug}`}
          className="text-on-surface-variant hover:text-on-surface transition-colors text-sm font-semibold flex items-center gap-2"
        >
          ← Back to Menu
        </Link>
        <h1 className="font-semibold text-lg text-on-background font-hanken">Your Cart</h1>
        <div className="w-24" />
      </header>

      {/* Main Content */}
      <div className="flex-grow max-w-4xl w-full mx-auto p-5 flex flex-col md:flex-row gap-6">
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
                className="bg-surface-container border border-border-base p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl relative"
              >
                {isUpdating && (
                  <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                    <Spinner size="sm" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-on-surface text-base font-sans">
                    {menuItemName}{" "}
                    {variantName && <span className="text-on-surface-variant font-normal">({variantName})</span>}
                  </h3>
                  <p className="text-sm font-bold text-primary mt-1 tabular-nums">{formatINR(itemPrice)}</p>

                  {/* Addons List */}
                  {item.addons && item.addons.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-border-base space-y-0.5">
                      {item.addons.map((a) => (
                        <p key={a.addonId?._id || a.addonId} className="text-xs text-on-surface-variant">
                          + {a.addonId?.name || "Addon"} (x{a.quantity}) : {formatINR((a.addonId?.price || 0) * a.quantity)}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Notes */}
                  {item.notes && (
                    <p className="text-xs text-on-surface-variant italic mt-2">Note: "{item.notes}"</p>
                  )}
                </div>

                <div className="flex items-center gap-6 self-end sm:self-center">
                  {/* Quantity Actions */}
                  <div className="flex items-center gap-2 bg-surface-container-low border border-border-base rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item, -1)}
                      disabled={item.quantity <= 1}
                      title={item.quantity <= 1 ? "Use the bin icon to remove this item" : "Decrease quantity"}
                      className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant font-bold rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      −
                    </button>
                    <span
                      key={item.quantity}
                      className="font-bold text-sm text-on-surface w-5 text-center tabular-nums animate-scale-in"
                    >
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item, 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant font-bold rounded-lg transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item)}
                    className="p-2 hover:bg-error/10 text-on-surface-variant hover:text-error rounded-xl transition-colors"
                    title="Remove item"
                    aria-label={`Remove ${menuItemName} from cart`}
                  >
                    🗑️
                  </button>
                </div>
              </Card>
            );
          })}

          {items.length === 0 && (
            <div className="py-20 flex flex-col items-center text-center gap-4">
              <span className="text-4xl">🛒</span>
              <p className="text-on-surface-variant text-sm">Your cart is empty right now.</p>
              <Link to={`/public/w/${outletSlug}`}>
                <Button variant="primary" className="bg-primary-fixed hover:brightness-95 text-on-primary-fixed border-none font-semibold">
                  Browse Menu
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Pricing Summary Sidepanel */}
        {items.length > 0 && (
          <div className="w-full md:w-80 shrink-0">
            <Card className="bg-surface-container border border-border-base p-5 rounded-2xl space-y-4 sticky top-24">
              <h2 className="text-base font-semibold text-on-background font-hanken border-b border-border-base pb-3">
                Bill Details
              </h2>
              <div className="space-y-2 text-sm text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Subtotal</span>
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
                <div className="flex justify-between border-t border-border-base pt-3 font-bold text-base text-on-background">
                  <span>To Pay</span>
                  <span className="text-primary tabular-nums">{formatINR(totalAmount)}</span>
                </div>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/public/w/${outletSlug}/checkout`)}
                  className="w-full bg-primary-fixed hover:brightness-95 text-on-primary-fixed font-bold py-3 px-4 rounded-xl shadow-[0_8px_20px_-8px_color-mix(in_srgb,var(--color-brand-accent)_35%,transparent)] transition-all text-sm"
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