import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPublicMenuApi, createOrUpdateCartApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";

export default function MenuPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);

  // Modal Item config states
  const [itemVariants, setItemVariants] = useState([]);
  const [itemAddons, setItemAddons] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedAddons, setSelectedAddons] = useState({}); // { addonId: quantity }
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);

  // Generate session token if not exists
  useEffect(() => {
    let token = localStorage.getItem("sessionToken");
    if (!token) {
      token = "WEB-SESS-" + Math.random().toString(36).substring(2, 15).toUpperCase() + "-" + Date.now();
      localStorage.setItem("sessionToken", token);
    }
  }, []);

  // Fetch Menu data
  useEffect(() => {
    if (!outletSlug) return;
    setLoading(true);
    getPublicMenuApi(outletSlug)
      .then((res) => {
        setData(res.data.data);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load restaurant menu");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [outletSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 text-white p-6">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Error</h2>
        <p className="text-zinc-400 mb-6">{error || "Something went wrong"}</p>
        <Link to="/login">
          <Button variant="primary">Return to Admin Login</Button>
        </Link>
      </div>
    );
  }

  const { outlet, categories, menuItems, variants, addons } = data;

  // Filter items
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenItemConfig = (item) => {
    setSelectedItem(item);
    const activeVariants = variants.filter((v) => v.menuItemId === item._id);
    const activeAddons = addons.filter((a) => a.menuItemId === item._id);
    
    setItemVariants(activeVariants);
    setItemAddons(activeAddons);
    
    setSelectedVariantId(activeVariants[0]?._id || "");
    setSelectedAddons({});
    setItemQuantity(1);
    setItemNotes("");
  };

  const handleToggleAddon = (addonId) => {
    setSelectedAddons((prev) => {
      const copy = { ...prev };
      if (copy[addonId]) {
        delete copy[addonId];
      } else {
        copy[addonId] = 1;
      }
      return copy;
    });
  };

  const handleAddonQty = (addonId, delta) => {
    setSelectedAddons((prev) => {
      const copy = { ...prev };
      if (copy[addonId] !== undefined) {
        const nextQty = copy[addonId] + delta;
        if (nextQty >= 1) {
          copy[addonId] = nextQty;
        }
      }
      return copy;
    });
  };

  const handleAddToCart = async () => {
    if (!selectedItem) return;
    setAddingToCart(true);

    const formattedAddons = Object.entries(selectedAddons).map(([addonId, qty]) => {
      const originalAddon = itemAddons.find((a) => a._id === addonId);
      return {
        addonId,
        quantity: qty,
        name: originalAddon?.name || "Addon",
        price: originalAddon?.price || 0,
      };
    });

    const payload = {
      sessionToken: localStorage.getItem("sessionToken"),
      outletId: outlet.id,
      item: {
        menuItemId: selectedItem._id,
        variantId: selectedVariantId || undefined,
        addons: formattedAddons,
        quantity: itemQuantity,
        notes: itemNotes || undefined,
      },
    };

    // Extract UTM parameters if present in URL
    const query = new URLSearchParams(window.location.search);
    const utmSource = query.get("utm_source") || "";
    const utmMedium = query.get("utm_medium") || "";
    const utmCampaign = query.get("utm_campaign") || "";
    const referrer = document.referrer || "";

    const finalPayload = {
      ...payload,
      utmSource,
      utmMedium,
      utmCampaign,
      referrer,
    };

    try {
      await createOrUpdateCartApi(finalPayload);
      setSelectedItem(null);
      // Redirect to cart
      navigate(`/public/w/${outletSlug}/cart`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add item to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Brand Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/60 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center font-bold text-white text-lg">
            FM
          </div>
          <div>
            <h1 className="font-bold text-lg text-white">{outlet.name}</h1>
            <p className="text-xs text-zinc-400">{outlet.address || "Website Ordering"}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link to={`/public/w/${outletSlug}/cart`} className="relative p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all">
            🛒 <span className="text-xs font-semibold text-zinc-300">View Cart</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row gap-6 p-6">
        {/* Sidebar categories navigation */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-3">Categories</h2>
          <button
            onClick={() => setSelectedCategory("all")}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              selectedCategory === "all"
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
            }`}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => setSelectedCategory(cat._id)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium text-sm ${
                selectedCategory === cat._id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-zinc-900 hover:bg-zinc-800 text-zinc-300"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </aside>

        {/* Catalog Menu grid */}
        <main className="flex-1 flex flex-col gap-6">
          {/* Search bar */}
          <div className="w-full max-w-md">
            <Input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder-zinc-500 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <Card
                key={item._id}
                onClick={() => handleOpenItemConfig(item)}
                className="bg-zinc-900 border-zinc-800 hover:border-indigo-500/40 cursor-pointer hover:shadow-xl transition-all p-5 flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  <h3 className="font-semibold text-zinc-100 text-base mb-1">{item.name}</h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                    {item.description || "Fresh and prepared with premium ingredients."}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <span className="text-lg font-bold text-white">₹{item.price}</span>
                  <span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                    Add +
                  </span>
                </div>
              </Card>
            ))}

            {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center text-zinc-500">
                No items found matching the selected filters.
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Item Customizer Modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={selectedItem.name}
          size="md"
        >
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 text-zinc-200">
            {/* Price */}
            <div>
              <span className="text-xs text-zinc-400 uppercase tracking-wider block mb-1">Base Price</span>
              <span className="text-2xl font-bold text-white">₹{selectedItem.price}</span>
            </div>

            {/* Description */}
            {selectedItem.description && (
              <p className="text-sm text-zinc-400 bg-zinc-950 p-3 rounded-xl border border-zinc-800/60">
                {selectedItem.description}
              </p>
            )}

            {/* Variants */}
            {itemVariants.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">Choose Variant</h4>
                <div className="space-y-2">
                  {itemVariants.map((v) => (
                    <label
                      key={v._id}
                      className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-indigo-500/30 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="item-variant"
                          value={v._id}
                          checked={selectedVariantId === v._id}
                          onChange={() => setSelectedVariantId(v._id)}
                          className="radio radio-xs radio-primary w-4 h-4 text-indigo-600 border-zinc-700 bg-zinc-800 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium">{v.name}</span>
                      </div>
                      <span className="text-sm font-bold">₹{v.price}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Addons */}
            {itemAddons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">Add Extra Addons</h4>
                <div className="space-y-2">
                  {itemAddons.map((a) => {
                    const isSelected = !!selectedAddons[a._id];
                    const qty = selectedAddons[a._id] || 0;

                    return (
                      <div
                        key={a._id}
                        className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-indigo-500/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleAddon(a._id)}
                            className="checkbox checkbox-xs checkbox-primary w-4 h-4 text-indigo-600 border-zinc-700 bg-zinc-800 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-zinc-300">₹{a.price}</span>
                          {isSelected && (
                            <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                              <button
                                onClick={() => handleAddonQty(a._id, -1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 font-bold rounded"
                              >
                                -
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{qty}</span>
                              <button
                                onClick={() => handleAddonQty(a._id, 1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 text-zinc-400 font-bold rounded"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center justify-between border-t border-zinc-800/80 pt-4">
              <span className="text-sm font-semibold text-zinc-300">Quantity</span>
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5">
                <button
                  onClick={() => setItemQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 text-zinc-300 font-bold rounded-lg"
                >
                  -
                </button>
                <span className="font-bold w-6 text-center text-sm">{itemQuantity}</span>
                <button
                  onClick={() => setItemQuantity(q => q + 1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 text-zinc-300 font-bold rounded-lg"
                >
                  +
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Special instructions</label>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="No onions, extra spicy, etc."
                className="textarea textarea-bordered w-full bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-500 rounded-xl p-3.5 text-sm focus:outline-none focus:border-indigo-500 h-20 resize-none"
              />
            </div>

            {/* Submit button */}
            <div className="pt-4 border-t border-zinc-800/80 flex items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setSelectedItem(null)}
                className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-300"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex-1 shadow-lg shadow-indigo-600/20"
              >
                {addingToCart ? "Adding..." : "Add to Cart"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {localStorage.getItem("sessionToken") && !localStorage.getItem("sessionToken").startsWith("WEB-SESS-") && (
        <div className="fixed bottom-6 right-6 z-50">
          <Link to={`/public/w/${outletSlug}/table-session`}>
            <button className="bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white font-extrabold px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-2 text-xs uppercase tracking-wider border border-indigo-400/20 transition-all cursor-pointer">
              <span>🍽️</span>
              <span>Table Bill & Pay</span>
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}
