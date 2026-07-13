import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPublicMenuApi, createOrUpdateCartApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";

const formatINR = (amount) => {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN")}`;
};

export default function MenuPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [cartAddedCount, setCartAddedCount] = useState(0);

  // Modal item config states
  const [itemVariants, setItemVariants] = useState([]);
  const [itemAddons, setItemAddons] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedAddons, setSelectedAddons] = useState({}); // { addonId: quantity }
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const sectionRefs = useRef({});
  const suppressObserver = useRef(false);
  const suppressTimeout = useRef(null);

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

  const outlet = data?.outlet;
  const categories = data?.categories || [];
  const menuItems = data?.menuItems || [];
  const variants = data?.variants || [];
  const addons = data?.addons || [];
  const table = data?.table;

  const isSearching = searchQuery.trim().length > 0;

  const itemCountByCategory = useMemo(() => {
    const map = {};
    menuItems.forEach((item) => {
      map[item.categoryId] = (map[item.categoryId] || 0) + 1;
    });
    return map;
  }, [menuItems]);

  const categoriesWithItems = useMemo(
    () => categories.filter((cat) => (itemCountByCategory[cat._id] || 0) > 0),
    [categories, itemCountByCategory]
  );

  const groupedSections = useMemo(
    () =>
      categoriesWithItems.map((cat) => ({
        ...cat,
        items: menuItems.filter((item) => item.categoryId === cat._id),
      })),
    [categoriesWithItems, menuItems]
  );

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const q = searchQuery.toLowerCase();
    return menuItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [isSearching, searchQuery, menuItems]);

  // Track which category section is in view to keep the pill rail in sync
  // while the guest scrolls through the menu.
  useEffect(() => {
    if (isSearching || groupedSections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressObserver.current) return;
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const top = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        const catId = top.target.getAttribute("data-category-id");
        if (catId) setSelectedCategory(catId);
      },
      { rootMargin: "-136px 0px -65% 0px", threshold: 0 }
    );

    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [isSearching, groupedSections]);

  const handleCategoryClick = (catId) => {
    setSelectedCategory(catId);
    if (isSearching) return;

    suppressObserver.current = true;
    if (suppressTimeout.current) clearTimeout(suppressTimeout.current);

    if (catId === "all") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const el = sectionRefs.current[catId];
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 128;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }

    suppressTimeout.current = setTimeout(() => {
      suppressObserver.current = false;
    }, 700);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border-base bg-surface-container-low/80 px-5 py-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-surface-container-high animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-surface-container-high rounded animate-pulse" />
            <div className="h-3 w-20 bg-surface-container-high rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 overflow-hidden">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-9 w-24 shrink-0 rounded-full bg-surface-container animate-pulse" />
          ))}
        </div>
        <div className="px-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-container animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-on-background p-6 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-error-container text-on-error-container flex items-center justify-center text-2xl mb-5">
          ⚠️
        </div>
        <h2 className="text-xl font-semibold mb-2 font-hanken">Couldn't load the menu</h2>
        <p className="text-on-surface-variant text-sm mb-7 text-center max-w-xs">
          {error || "Something went wrong on our end."}
        </p>
        <Link to="/login">
          <Button variant="primary" className="bg-primary-fixed hover:brightness-95 text-on-primary-fixed border-none font-semibold">
            Return to Admin Login
          </Button>
        </Link>
      </div>
    );
  }

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
    setJustAdded(false);
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
      setJustAdded(true);
      setCartAddedCount((c) => c + itemQuantity);
      await new Promise((resolve) => setTimeout(resolve, 380));
      setSelectedItem(null);
      navigate(`/public/w/${outletSlug}/cart`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add item to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const showTableSessionFab =
    localStorage.getItem("sessionToken") && !localStorage.getItem("sessionToken").startsWith("WEB-SESS-");

  const renderItemCard = (item) => (
    <Card
      key={item._id}
      onClick={() => handleOpenItemConfig(item)}
      className="group bg-surface-container border border-border-base hover:border-primary/50 cursor-pointer transition-all duration-200 p-4 flex flex-col justify-between min-h-[168px] rounded-2xl hover:shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--color-brand-accent)_20%,transparent)] active:scale-[0.98]"
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {typeof item.isVeg === "boolean" && (
              <span
                className={`shrink-0 w-3.5 h-3.5 border-2 rounded-[3px] flex items-center justify-center ${
                  item.isVeg ? "border-success-green" : "border-error"
                }`}
                aria-label={item.isVeg ? "Vegetarian" : "Non-vegetarian"}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-success-green" : "bg-error"}`} />
              </span>
            )}
            <h3 className="font-semibold text-on-surface text-[15px] leading-snug truncate font-sans">
              {item.name}
            </h3>
          </div>
        </div>

        {(item.isBestseller || item.isNew || item.isChefSpecial) && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {item.isBestseller && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-md">
                Bestseller
              </span>
            )}
            {item.isChefSpecial && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                Chef's Pick
              </span>
            )}
            {item.isNew && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary bg-secondary-container px-2 py-0.5 rounded-md">
                New
              </span>
            )}
          </div>
        )}

        <p className="text-[13px] text-on-surface-variant line-clamp-2 leading-relaxed">
          {item.description || "Fresh and prepared with premium ingredients."}
        </p>

        {(typeof item.rating === "number" || item.prepTimeMinutes) && (
          <div className="flex items-center gap-3 mt-2 text-[11px] text-on-surface-variant">
            {typeof item.rating === "number" && (
              <span className="flex items-center gap-1">
                <span className="text-tertiary">★</span> {item.rating.toFixed(1)}
              </span>
            )}
            {item.prepTimeMinutes && <span>{item.prepTimeMinutes} min</span>}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-base/70">
        <span className="text-base font-bold text-on-surface font-sans tabular-nums">
          {formatINR(item.price)}
        </span>
        <span className="text-xs font-bold text-on-primary-fixed bg-primary-fixed group-hover:brightness-95 px-3 py-1.5 rounded-lg transition-all">
          Add +
        </span>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border-base bg-background/90 backdrop-blur sticky top-0 z-40 px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {outlet?.logoUrl ? (
            <img
              src={outlet.logoUrl}
              alt={outlet.name}
              className="w-11 h-11 rounded-2xl object-cover border border-border-base"
            />
          ) : (
            <div className="w-11 h-11 shrink-0 rounded-2xl bg-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)] flex items-center justify-center font-bold text-white text-lg font-hanken">
              {outlet?.name?.charAt(0) || "F"}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-semibold text-[17px] text-on-background truncate font-hanken">
              {outlet?.name}
            </h1>
            <div className="flex items-center gap-2 text-xs text-on-surface-variant truncate">
              {table?.number && <span className="text-primary font-semibold">Table {table.number}</span>}
              {table?.number && (outlet?.cuisine || outlet?.address) && <span>·</span>}
              {outlet?.cuisine && <span className="truncate">{outlet.cuisine}</span>}
              {!outlet?.cuisine && outlet?.address && <span className="truncate">{outlet.address}</span>}
              {typeof outlet?.rating === "number" && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 shrink-0">
                    <span className="text-tertiary">★</span> {outlet.rating.toFixed(1)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <Link
          to={`/public/w/${outletSlug}/cart`}
          className="relative shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-container hover:bg-surface-container-high border border-border-base rounded-xl transition-colors"
        >
          <span className="text-base">🛒</span>
          <span className="text-xs font-semibold text-on-surface hidden sm:inline">Cart</span>
          {cartAddedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-bold rounded-full bg-error text-on-error">
              {cartAddedCount}
            </span>
          )}
        </Link>
      </header>

      {/* Sticky category rail */}
      {!isSearching && groupedSections.length > 0 && (
        <div className="sticky top-[65px] z-30 bg-background/95 backdrop-blur border-b border-border-base px-5 py-2.5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => handleCategoryClick("all")}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors ${
              selectedCategory === "all"
                ? "bg-primary-fixed text-on-primary-fixed"
                : "bg-surface-container text-on-surface-variant border border-border-base hover:text-on-surface hover:bg-surface-container-high"
            }`}
          >
            All
          </button>
          {groupedSections.map((cat) => (
            <button
              type="button"
              key={cat._id}
              onClick={() => handleCategoryClick(cat._id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                selectedCategory === cat._id
                  ? "bg-primary-fixed text-on-primary-fixed"
                  : "bg-surface-container text-on-surface-variant border border-border-base hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {cat.name}
              <span className={selectedCategory === cat._id ? "opacity-70" : "opacity-50"}>
                {itemCountByCategory[cat._id]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-5 py-5 flex flex-col gap-6">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">
            ⌕
          </span>
          <Input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search dishes"
            className="bg-surface-container border-border-base text-on-surface placeholder-on-surface-variant focus:border-primary rounded-xl pl-9 w-full"
          />
        </div>

        {isSearching ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for "{searchQuery}"
            </p>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.map(renderItemCard)}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center text-center gap-3">
                <span className="text-3xl">🔍</span>
                <p className="text-sm text-on-surface-variant">No dishes match "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        ) : groupedSections.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center gap-3">
            <span className="text-3xl">🍽️</span>
            <p className="text-sm text-on-surface-variant">The menu isn't set up yet. Please check back soon.</p>
          </div>
        ) : (
          groupedSections.map((cat) => (
            <section
              key={cat._id}
              data-category-id={cat._id}
              ref={(el) => (sectionRefs.current[cat._id] = el)}
              className="scroll-mt-32"
            >
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-lg font-semibold text-on-background font-hanken">{cat.name}</h2>
                <span className="text-xs text-on-surface-variant">{cat.items.length} items</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{cat.items.map(renderItemCard)}</div>
            </section>
          ))
        )}
      </div>

      {/* Item Customizer Modal */}
      {selectedItem && (
        <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem.name} size="md">
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2 text-on-surface font-sans">
            {/* Price */}
            <div>
              <span className="text-xs text-on-surface-variant uppercase tracking-wider block mb-1">Base Price</span>
              <span className="text-2xl font-bold text-on-surface tabular-nums">{formatINR(selectedItem.price)}</span>
            </div>

            {/* Description */}
            {selectedItem.description && (
              <p className="text-sm text-on-surface-variant bg-surface-container-low p-3 rounded-xl border border-border-base">
                {selectedItem.description}
              </p>
            )}

            {/* Variants */}
            {itemVariants.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-on-surface mb-3 uppercase tracking-wider">Choose Variant</h4>
                <div className="space-y-2">
                  {itemVariants.map((v) => (
                    <label
                      key={v._id}
                      className="flex items-center justify-between p-3.5 bg-surface-container border border-border-base rounded-xl cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="item-variant"
                          value={v._id}
                          checked={selectedVariantId === v._id}
                          onChange={() => setSelectedVariantId(v._id)}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-medium">{v.name}</span>
                      </div>
                      <span className="text-sm font-bold tabular-nums">{formatINR(v.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Addons */}
            {itemAddons.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-on-surface mb-3 uppercase tracking-wider">Add Extra Addons</h4>
                <div className="space-y-2">
                  {itemAddons.map((a) => {
                    const isSelected = !!selectedAddons[a._id];
                    const qty = selectedAddons[a._id] || 0;

                    return (
                      <div
                        key={a._id}
                        className="flex items-center justify-between p-3.5 bg-surface-container border border-border-base rounded-xl hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleAddon(a._id)}
                            className="w-4 h-4 accent-primary rounded"
                          />
                          <span className="text-sm font-medium">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-on-surface-variant tabular-nums">{formatINR(a.price)}</span>
                          {isSelected && (
                            <div className="flex items-center gap-2 bg-surface-container-low border border-border-base rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => handleAddonQty(a._id, -1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant font-bold rounded"
                                aria-label={`Decrease ${a.name} quantity`}
                              >
                                −
                              </button>
                              <span className="text-xs font-bold w-4 text-center">{qty}</span>
                              <button
                                type="button"
                                onClick={() => handleAddonQty(a._id, 1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-surface-container-high text-on-surface-variant font-bold rounded"
                                aria-label={`Increase ${a.name} quantity`}
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
            <div className="flex items-center justify-between border-t border-border-base pt-4">
              <span className="text-sm font-semibold text-on-surface">Quantity</span>
              <div className="flex items-center gap-3 bg-surface-container border border-border-base rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-high text-on-surface font-bold rounded-lg"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="font-bold w-6 text-center text-sm tabular-nums">{itemQuantity}</span>
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-high text-on-surface font-bold rounded-lg"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider block mb-2">
                Special instructions
              </label>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="No onions, extra spicy, etc."
                className="w-full bg-surface-container border border-border-base text-on-surface placeholder-on-surface-variant rounded-xl p-3.5 text-sm focus:outline-none focus:border-primary h-20 resize-none"
              />
            </div>

            {/* Submit button */}
            <div className="pt-4 border-t border-border-base flex items-center gap-3 sticky bottom-0 bg-background -mx-2 px-2 pb-1">
              <Button
                variant="secondary"
                onClick={() => setSelectedItem(null)}
                className="flex-1 bg-surface-container border border-border-base text-on-surface"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex-1 bg-primary-fixed hover:brightness-95 text-on-primary-fixed border-none font-bold disabled:opacity-70"
              >
                {justAdded ? "Added ✓" : addingToCart ? "Adding..." : `Add ${itemQuantity} to Cart · ${formatINR(
                  (selectedItem.price +
                    (itemVariants.find((v) => v._id === selectedVariantId)?.price || 0) +
                    Object.entries(selectedAddons).reduce((sum, [addonId, qty]) => {
                      const addon = itemAddons.find((a) => a._id === addonId);
                      return sum + (addon?.price || 0) * qty;
                    }, 0)) * itemQuantity
                )}`}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showTableSessionFab && (
        <div className="fixed bottom-6 right-5 z-50">
          <Link to={`/public/w/${outletSlug}/table-session`}>
            <button
              type="button"
              className="bg-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)] hover:brightness-110 text-white font-extrabold px-5 py-3.5 rounded-full shadow-[0_10px_28px_-8px_color-mix(in_srgb,var(--color-brand-accent)_45%,transparent)] flex items-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              <span>🍽️</span>
              <span>Table Bill &amp; Pay</span>
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}