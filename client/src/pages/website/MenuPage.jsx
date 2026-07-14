import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPublicMenuApi, createOrUpdateCartApi, getCartApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { HiOutlineUsers, HiOutlineSparkles, HiOutlineBookOpen, HiOutlineChevronRight } from "react-icons/hi2";

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

  // Scanned printed menu card state
  const [showPhysicalMenu, setShowPhysicalMenu] = useState(false);

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
    
    // Fetch menu & cart details in parallel
    Promise.all([
      getPublicMenuApi(outletSlug),
      getCartApi()
    ])
      .then(([menuRes, cartRes]) => {
        const payload = menuRes.data.data;
        setData(payload);
        setError(null);

        // Calculate initial cart added count
        const items = cartRes.data.data?.items || [];
        const count = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartAddedCount(count);
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
      
      // Flash success message
      await new Promise((resolve) => setTimeout(resolve, 380));
      setSelectedItem(null);
      
      // NO direct navigation to the cart anymore!
      // This allows the user to continue adding more items.
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add item to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  const showTableSessionFab =
    localStorage.getItem("sessionToken") && !localStorage.getItem("sessionToken").startsWith("WEB-SESS-");

  const renderItemCard = (item) => (
    <div
      key={item._id}
      onClick={() => handleOpenItemConfig(item)}
      className="group bg-white dark:bg-zinc-900 border border-zinc-150/60 dark:border-zinc-800 hover:border-[#6311f4] cursor-pointer transition-all duration-300 p-4 rounded-3xl flex gap-4 justify-between items-center shadow-sm hover:shadow-lg shadow-zinc-100 dark:shadow-none active:scale-[0.98] relative overflow-hidden"
    >
      {/* Left text section */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2">
          {typeof item.isVeg === "boolean" && (
            <span
              className={`shrink-0 w-3.5 h-3.5 border border-current rounded-[3px] flex items-center justify-center ${
                item.isVeg ? "text-emerald-600" : "text-red-500"
              }`}
              aria-label={item.isVeg ? "Vegetarian" : "Non-vegetarian"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-emerald-600" : "bg-red-500"}`} />
            </span>
          )}
          {(item.isBestseller || item.isNew || item.isChefSpecial) && (
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded-md">
              {item.isBestseller ? "Bestseller" : item.isChefSpecial ? "Chef's Pick" : "New"}
            </span>
          )}
        </div>
        <h3 className="font-extrabold text-zinc-950 dark:text-zinc-50 text-[15px] leading-snug tracking-tight font-sans">
          {item.name}
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-normal">
          {item.description || "Fresh and prepared with premium ingredients."}
        </p>
        <div className="flex items-center gap-3 text-[10px] text-zinc-455 dark:text-zinc-500 font-bold">
          <span className="text-zinc-950 dark:text-zinc-200 text-sm font-black tabular-nums">
            {formatINR(item.price)}
          </span>
          {typeof item.rating === "number" && (
            <span className="flex items-center gap-0.5 text-amber-500">
              ★ <span className="text-zinc-600 dark:text-zinc-400 font-extrabold">{item.rating.toFixed(1)}</span>
            </span>
          )}
          {item.prepTimeMinutes && <span>· {item.prepTimeMinutes} mins</span>}
        </div>
      </div>

      {/* Right image section */}
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden shrink-0 border border-zinc-100/60 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
        {item.image ? (
          <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="text-zinc-300 dark:text-zinc-700 text-3xl">🍽️</div>
        )}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-[#6311f4] dark:text-[#a07cff] text-[10px] font-black uppercase tracking-wider py-1 px-3.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all">
          Add
        </div>
      </div>
    </div>
  );

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-on-background flex flex-col font-sans">
      {/* Premium Food Banner Hero Section */}
      <div className="relative h-56 w-full overflow-hidden shrink-0">
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"
          alt="Restaurant banner"
          className="w-full h-full object-cover brightness-[0.6] scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        
        {/* Floating actions (Back/Close & Cart) */}
        <div className="absolute top-4 left-5 right-5 flex justify-between items-center z-10">
          <Link
            to="/login"
            className="flex items-center justify-center w-9 h-9 rounded-full bg-black/45 border border-white/15 text-white hover:bg-black/60 transition-all text-xs uppercase"
          >
            ←
          </Link>
          <Link
            to={`/public/w/${outletSlug}/cart`}
            className="relative flex items-center justify-center w-9 h-9 rounded-full bg-black/45 border border-white/15 text-white hover:bg-black/60 transition-all"
          >
            <span className="text-sm">🛒</span>
            {cartAddedCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full bg-[#6311f4] text-white">
                {cartAddedCount}
              </span>
            )}
          </Link>
        </div>

        {/* Brand Information overlay */}
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            {outlet?.logoUrl ? (
              <img
                src={outlet.logoUrl}
                alt={outlet.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/30 shadow-lg shrink-0 bg-white"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#6311f4] text-white flex items-center justify-center font-black text-xl border-2 border-white/30 shadow-lg shrink-0">
                {outlet?.name?.charAt(0) || "F"}
              </div>
            )}
            <div className="text-white">
              <h2 className="font-black text-lg leading-tight drop-shadow-md tracking-tight">{outlet?.name}</h2>
              <p className="text-[10px] text-white/70 mt-1 font-semibold uppercase tracking-wider">{outlet?.cuisine || "Modern Dining Experience"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPhysicalMenu(true)}
              className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-3.5 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md"
            >
              <HiOutlineBookOpen className="text-xs" />
              <span>Menu Card</span>
            </button>
            {table?.number && (
              <div className="bg-[#6311f4] border border-white/10 px-3.5 py-1.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider shadow-md">
                Table {table.number}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky category rail */}
      {!isSearching && groupedSections.length > 0 && (
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur border-b border-zinc-150/60 dark:border-zinc-900 px-5 py-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => handleCategoryClick("all")}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#6311f4] text-white shadow-md shadow-[#6311f4]/15"
                : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-150/60 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-105"
            }`}
          >
            All
          </button>
          {groupedSections.map((cat) => (
            <button
              type="button"
              key={cat._id}
              onClick={() => handleCategoryClick(cat._id)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === cat._id
                  ? "bg-[#6311f4] text-white shadow-md shadow-[#6311f4]/15"
                  : "bg-zinc-100 dark:bg-zinc-900 text-zinc-500 border border-zinc-150/60 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-105"
              }`}
            >
              {cat.name}
              <span className={selectedCategory === cat._id ? "opacity-90" : "opacity-55"}>
                ({itemCountByCategory[cat._id]})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-5 py-6 flex flex-col gap-6">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm pointer-events-none">
            🔍
          </span>
          <Input
            type="text"
            placeholder="Search delicious dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search dishes"
            className="!bg-white dark:!bg-zinc-900 border-zinc-150/60 dark:border-zinc-800 text-zinc-900 placeholder-zinc-400 focus:border-[#6311f4] rounded-2xl pl-9 w-full shadow-sm text-xs font-medium py-3"
          />
        </div>

        {isSearching ? (
          <div className="flex flex-col gap-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for "{searchQuery}"
            </p>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.map(renderItemCard)}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center text-center gap-3">
                <span className="text-3xl">🔍</span>
                <p className="text-sm text-zinc-500">No dishes match "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-black text-[#6311f4] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        ) : groupedSections.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center gap-3">
            <span className="text-3xl">🍽️</span>
            <p className="text-sm text-zinc-500">The menu isn't set up yet. Please check back soon.</p>
          </div>
        ) : (
          groupedSections.map((cat) => (
            <section
              key={cat._id}
              data-category-id={cat._id}
              ref={(el) => (sectionRefs.current[cat._id] = el)}
              className="scroll-mt-32"
            >
              <div className="flex items-baseline justify-between mb-4 border-b border-zinc-100/60 dark:border-zinc-850/60 pb-1.5">
                <h2 className="text-base font-black text-zinc-950 dark:text-zinc-100 tracking-tight font-hanken">{cat.name}</h2>
                <span className="text-[10px] text-zinc-450 dark:text-zinc-500 font-bold uppercase tracking-wider">{cat.items.length} items</span>
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
            {/* Premium Item Image */}
            {selectedItem.image && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden border border-zinc-150/40 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center relative shadow-sm">
                <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
              </div>
            )}

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
                  ((selectedVariantId
                    ? (itemVariants.find((v) => v._id === selectedVariantId)?.price || selectedItem.price)
                    : selectedItem.price) +
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

      {/* Scanned printed physical menu modal */}
      {showPhysicalMenu && (
        <Modal isOpen={showPhysicalMenu} onClose={() => setShowPhysicalMenu(false)} title="Menu Card" size="md">
          <div className="flex flex-col items-center justify-center p-2">
            <img
              src="https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?auto=format&fit=crop&w=800&q=80"
              alt="Physical Menu Card Reference"
              className="max-w-full max-h-[72vh] object-contain rounded-2xl shadow-xl border border-zinc-200"
            />
            <p className="text-[10px] text-zinc-450 mt-3 font-semibold text-center uppercase tracking-wider">Physical printed menu card for reference</p>
          </div>
        </Modal>
      )}

      {/* Floating center-aligned bottom "View Cart" sticky bar */}
      {cartAddedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-5 animate-slideUp">
          <Link to={`/public/w/${outletSlug}/cart`} className="no-underline">
            <div className="bg-[#6311f4] hover:bg-[#520dd4] text-white px-5 py-4 rounded-2xl shadow-xl shadow-[#6311f4]/35 flex items-center justify-between transition-all duration-200 active:scale-95">
              <div className="flex items-center gap-3">
                <span className="text-lg">🛒</span>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black uppercase tracking-wider leading-none">View Cart</span>
                  <span className="text-[10px] text-white/80 leading-none mt-1 font-medium">{cartAddedCount} item{cartAddedCount === 1 ? '' : 's'} added</span>
                </div>
              </div>
              <div className="flex items-center gap-1 font-bold text-xs uppercase tracking-wider">
                <span>Go to Cart</span>
                <HiOutlineChevronRight className="text-sm" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Table Session FAB (offsets vertically if Cart bar is visible) */}
      {showTableSessionFab && (
        <div className={`fixed z-50 transition-all duration-300 ${cartAddedCount > 0 ? 'bottom-28' : 'bottom-6'} right-5`}>
          <Link to={`/public/w/${outletSlug}/table-session`}>
            <button
              type="button"
              className="bg-[#6311f4] hover:brightness-110 text-white font-extrabold px-5 py-3.5 rounded-full shadow-lg flex items-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
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