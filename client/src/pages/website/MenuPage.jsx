import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { getPublicMenuApi, createOrUpdateCartApi, getCartApi } from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { 
  HiOutlineShoppingCart, 
  HiMagnifyingGlass, 
  HiXMark, 
  HiStar, 
  HiOutlineClock, 
  HiOutlineExclamationTriangle 
} from "react-icons/hi2";

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

  // Sync initial cart size from backend on mount
  useEffect(() => {
    getCartApi()
      .then((res) => {
        const cartItems = res.data.data?.items || [];
        const totalCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
        setCartAddedCount(totalCount);
      })
      .catch((err) => {
        console.warn("Failed to load initial cart count:", err);
      });
  }, []);

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
      <div className="min-h-screen bg-background p-6 space-y-6">
        {/* Skeleton header */}
        <div className="flex items-center justify-between border-b border-border-base/50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-surface-container-high rounded animate-pulse" />
              <div className="h-3 w-20 bg-surface-container-high rounded animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-20 bg-surface-container-high rounded-xl animate-pulse" />
        </div>
        
        {/* Skeleton Category Rail */}
        <div className="flex gap-2 overflow-hidden py-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-24 shrink-0 rounded-full bg-surface-container animate-pulse" />
          ))}
        </div>

        {/* Skeleton Items list */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-surface-container/60 border border-border-base/40 rounded-3xl flex justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="h-4 w-1/3 bg-surface-container-high rounded animate-pulse" />
                <div className="h-3 w-3/4 bg-surface-container-high rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-surface-container-high rounded animate-pulse" />
              </div>
              <div className="w-24 h-24 rounded-2xl bg-surface-container-high animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-on-background p-6">
        <div className="relative w-full max-w-md bg-surface-container/60 border border-border-base/50 backdrop-blur-md shadow-xl rounded-3xl p-8 text-center space-y-6 animate-scale-in">
          <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-error/10 border border-error/30 animate-pulse" />
            <div className="relative w-16 h-16 rounded-full bg-error/10 flex items-center justify-center text-error">
              <HiOutlineExclamationTriangle className="text-3xl" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-hanken tracking-tight">Couldn't load menu</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mx-auto">
              {error || "Something went wrong on our end. Please try again later."}
            </p>
          </div>
          <Link to="/login" className="block pt-2">
            <Button variant="primary" className="w-full bg-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)] hover:brightness-115 text-white border-none font-semibold py-3 rounded-2xl transition-all">
              Return to Admin Login
            </Button>
          </Link>
        </div>
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
      className="group bg-surface-container border border-border-base hover:border-primary/50 cursor-pointer transition-all duration-200 p-5 rounded-2xl hover:shadow-[0_8px_24px_-8px_color-mix(in_srgb,var(--color-brand-accent)_15%,transparent)] active:scale-[0.99] flex gap-4 items-start justify-between relative overflow-hidden"
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Vegetarian indicator and tag labels */}
        <div className="flex items-center gap-2 flex-wrap">
          {typeof item.isVeg === "boolean" && (
            <span
              className={`shrink-0 w-4 h-4 border-2 rounded-md flex items-center justify-center ${
                item.isVeg ? "border-success-green/45 bg-success-green/5" : "border-error/45 bg-error/5"
              }`}
              aria-label={item.isVeg ? "Vegetarian" : "Non-vegetarian"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-success-green" : "bg-error"}`} />
            </span>
          )}
          {item.isBestseller && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-tertiary bg-tertiary/10 px-2 py-0.5 rounded-md">
              Bestseller
            </span>
          )}
          {item.isChefSpecial && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md">
              Chef's Pick
            </span>
          )}
          {item.isNew && (
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary bg-secondary-container px-2 py-0.5 rounded-md">
              New
            </span>
          )}
        </div>

        {/* Dish Title */}
        <h3 className="font-bold text-on-surface text-base tracking-tight leading-snug truncate font-sans">
          {item.name}
        </h3>

        {/* Dish Description */}
        <p className="text-[13px] text-on-surface-variant line-clamp-2 leading-relaxed">
          {item.description || "Fresh and prepared with premium ingredients."}
        </p>

        {/* Rating and Prep Time indicators */}
        {(typeof item.rating === "number" || item.prepTimeMinutes) && (
          <div className="flex items-center gap-3 text-[11px] text-on-surface-variant font-semibold">
            {typeof item.rating === "number" && (
              <span className="flex items-center gap-0.5">
                <HiStar className="text-amber-500 text-xs" /> {item.rating.toFixed(1)}
              </span>
            )}
            {item.prepTimeMinutes && (
              <span className="flex items-center gap-1">
                <HiOutlineClock className="text-xs" /> {item.prepTimeMinutes} min
              </span>
            )}
          </div>
        )}

        {/* Price tag */}
        <div className="text-[15px] font-extrabold text-on-surface font-sans tabular-nums pt-1">
          {formatINR(item.price)}
        </div>
      </div>

      {/* Cloudinary optimized image box */}
      <div className="flex flex-col items-center shrink-0 relative">
        <div className="w-24 h-24 rounded-2xl overflow-hidden border border-border-base/50 bg-surface-container-low shadow-sm aspect-square relative">
          {item.image ? (
            <img
              src={item.image.includes("res.cloudinary.com") ? item.image.replace("/upload/", "/upload/f_auto,q_auto,w_200,h_200,c_fill/") : item.image}
              alt={item.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-surface-container-low to-surface-container-high text-on-surface-variant/40">
              <span className="text-2xl mb-0.5">🍽️</span>
              <span className="text-[9px] font-bold tracking-wider uppercase font-hanken">OmniServe</span>
            </div>
          )}
        </div>
        {/* Floating overlays add button */}
        <button
          type="button"
          className="absolute -bottom-2 bg-background hover:bg-surface-container border border-border-base hover:border-primary/50 text-primary font-bold text-[10px] px-3.5 py-1.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-0.5 cursor-pointer uppercase tracking-wider"
        >
          Add <span className="text-[10px] opacity-75">+</span>
        </button>
      </div>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-on-background flex flex-col font-sans">
      {/* Header bar */}
      <header className="border-b border-border-base/55 bg-background/90 backdrop-blur-md sticky top-0 z-40 px-5 py-3 flex items-center justify-between gap-3 shadow-sm">
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
            <h1 className="font-bold text-[16px] text-on-background truncate font-hanken">
              {outlet?.name}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-on-surface-variant truncate">
              {table?.number && <span className="text-primary font-bold uppercase tracking-wider bg-primary/5 px-1.5 py-0.5 rounded-md">Table {table.number}</span>}
              {table?.number && (outlet?.cuisine || outlet?.address) && <span className="opacity-45">·</span>}
              {outlet?.cuisine && <span className="truncate">{outlet.cuisine}</span>}
              {!outlet?.cuisine && outlet?.address && <span className="truncate">{outlet.address}</span>}
            </div>
          </div>
        </div>

        <Link
          to={`/public/w/${outletSlug}/cart`}
          className="relative shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 bg-surface-container hover:bg-surface-container-high border border-border-base rounded-xl transition-all active:scale-95"
        >
          <HiOutlineShoppingCart className="text-lg text-on-surface" />
          <span className="text-xs font-semibold text-on-surface hidden sm:inline">Cart</span>
          {cartAddedCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center text-[10px] font-extrabold rounded-full bg-error text-on-error animate-scale-in">
              {cartAddedCount}
            </span>
          )}
        </Link>
      </header>

      {/* Category Pills Slider */}
      {!isSearching && groupedSections.length > 0 && (
        <div className="sticky top-[61px] z-30 bg-background/95 backdrop-blur-md border-b border-border-base/55 px-5 py-2.5 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => handleCategoryClick("all")}
            className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              selectedCategory === "all"
                ? "bg-primary-fixed text-on-primary-fixed shadow-sm"
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
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === cat._id
                  ? "bg-primary-fixed text-on-primary-fixed shadow-sm"
                  : "bg-surface-container text-on-surface-variant border border-border-base hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {cat.name}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selectedCategory === cat._id ? "bg-on-primary-fixed/10 text-on-primary-fixed" : "bg-surface-container-high text-on-surface-variant/70"}`}>
                {itemCountByCategory[cat._id]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main search and content list */}
      <div className="flex-1 max-w-3xl w-full mx-auto px-5 py-5 flex flex-col gap-6">
        {/* Search bar */}
        <div className="relative">
          <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-base pointer-events-none" />
          <Input
            type="text"
            placeholder="Search dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search dishes"
            className="bg-surface-container/60 border-border-base text-on-surface placeholder-on-surface-variant focus:border-primary rounded-2xl pl-10 pr-10 w-full shadow-sm"
          />
          {isSearching && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface rounded-full transition-colors cursor-pointer"
            >
              <HiXMark className="text-base" />
            </button>
          )}
        </div>

        {isSearching ? (
          <div className="flex flex-col gap-4">
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for "{searchQuery}"
            </p>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {searchResults.map(renderItemCard)}
              </div>
            ) : (
              <div className="py-16 flex flex-col items-center text-center gap-3 bg-surface-container/20 border border-dashed border-border-base/50 rounded-3xl animate-scale-in">
                <span className="text-4xl">🔍</span>
                <h3 className="text-base font-semibold text-on-surface">No dishes match "{searchQuery}"</h3>
                <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
                  Try checking spelling or exploring other sections.
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs font-bold text-primary bg-primary/5 hover:bg-primary/10 px-4 py-2 rounded-xl transition-all cursor-pointer border border-primary/15"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        ) : groupedSections.length === 0 ? (
          <div className="py-16 flex flex-col items-center text-center gap-3 bg-surface-container/20 border border-dashed border-border-base/50 rounded-3xl animate-scale-in">
            <span className="text-4xl">🍽️</span>
            <h3 className="text-base font-semibold text-on-surface">No Menu Items Found</h3>
            <p className="text-xs text-on-surface-variant max-w-xs leading-relaxed">
              The menu is not configured yet. Please check back later.
            </p>
          </div>
        ) : (
          groupedSections.map((cat) => (
            <section
              key={cat._id}
              data-category-id={cat._id}
              ref={(el) => (sectionRefs.current[cat._id] = el)}
              className="scroll-mt-32"
            >
              <div className="flex items-baseline justify-between mb-3.5 border-b border-border-base/40 pb-2">
                <h2 className="text-[17px] font-bold text-on-background font-hanken tracking-tight">{cat.name}</h2>
                <span className="text-xs text-on-surface-variant font-medium">{cat.items.length} items</span>
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
            {/* Price tag header */}
            <div className="bg-surface-container-low border border-border-base/50 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block mb-0.5">Base Price</span>
                <span className="text-2xl font-extrabold text-on-surface tabular-nums">{formatINR(selectedItem.price)}</span>
              </div>
              {typeof selectedItem.isVeg === "boolean" && (
                <span
                  className={`w-7 h-7 border-2 rounded-lg flex items-center justify-center ${
                    selectedItem.isVeg ? "border-success-green/45 bg-success-green/5" : "border-error/45 bg-error/5"
                  }`}
                  aria-label={selectedItem.isVeg ? "Vegetarian" : "Non-vegetarian"}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedItem.isVeg ? "bg-success-green" : "bg-error"}`} />
                </span>
              )}
            </div>

            {/* Description */}
            {selectedItem.description && (
              <p className="text-sm text-on-surface-variant bg-surface-container-lowest p-4 rounded-2xl border border-border-base/40 leading-relaxed">
                {selectedItem.description}
              </p>
            )}

            {/* Variants select list */}
            {itemVariants.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Choose Variant</h4>
                <div className="space-y-2">
                  {itemVariants.map((v) => (
                    <label
                      key={v._id}
                      className={`flex items-center justify-between p-4 border rounded-2xl cursor-pointer transition-all ${
                        selectedVariantId === v._id
                          ? "bg-primary/5 border-primary text-primary"
                          : "bg-surface-container/60 border-border-base hover:bg-surface-container-high text-on-surface"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="item-variant"
                          value={v._id}
                          checked={selectedVariantId === v._id}
                          onChange={() => setSelectedVariantId(v._id)}
                          className="w-4 h-4 accent-primary cursor-pointer"
                        />
                        <span className="text-sm font-semibold">{v.name}</span>
                      </div>
                      <span className="text-sm font-extrabold tabular-nums">{formatINR(v.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Addons select list */}
            {itemAddons.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Add Extra Addons</h4>
                <div className="space-y-2">
                  {itemAddons.map((a) => {
                    const isSelected = !!selectedAddons[a._id];
                    const qty = selectedAddons[a._id] || 0;

                    return (
                      <div
                        key={a._id}
                        className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${
                          isSelected
                            ? "bg-primary/5 border-primary text-primary"
                            : "bg-surface-container/60 border-border-base hover:bg-surface-container-high text-on-surface"
                        }`}
                      >
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleToggleAddon(a._id)}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleAddon(a._id)}
                            className="w-4 h-4 accent-primary rounded cursor-pointer"
                          />
                          <span className="text-sm font-semibold">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-on-surface-variant/80 tabular-nums">{formatINR(a.price)}</span>
                          {isSelected && (
                            <div className="flex items-center gap-2 bg-background border border-border-base rounded-xl p-1 animate-scale-in" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleAddonQty(a._id, -1)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-surface-container text-on-surface font-bold rounded-lg transition-colors cursor-pointer"
                                aria-label={`Decrease ${a.name} quantity`}
                              >
                                −
                              </button>
                              <span className="text-xs font-bold w-4 text-center text-on-surface">{qty}</span>
                              <button
                                type="button"
                                onClick={() => handleAddonQty(a._id, 1)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-surface-container text-on-surface font-bold rounded-lg transition-colors cursor-pointer"
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

            {/* Item quantity controls */}
            <div className="flex items-center justify-between border-t border-border-base/55 pt-4">
              <span className="text-sm font-bold text-on-surface">Quantity</span>
              <div className="flex items-center gap-3 bg-surface-container border border-border-base rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center hover:bg-surface-container-high text-on-surface font-bold rounded-xl transition-colors cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="font-extrabold w-6 text-center text-sm tabular-nums text-on-surface">{itemQuantity}</span>
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center hover:bg-surface-container-high text-on-surface font-bold rounded-xl transition-colors cursor-pointer"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Special Instructions Notes textarea */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block">
                Special instructions
              </label>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="No onions, extra spicy, sauce on the side, etc."
                className="w-full bg-surface-container/60 border border-border-base text-on-surface placeholder-on-surface-variant focus:border-primary rounded-2xl p-3.5 text-sm focus:outline-none h-20 resize-none transition-colors"
              />
            </div>

            {/* Customizer footer buttons */}
            <div className="pt-4 border-t border-border-base/55 flex items-center gap-3 sticky bottom-0 bg-background -mx-2 px-2 pb-1 z-10">
              <Button
                variant="secondary"
                onClick={() => setSelectedItem(null)}
                className="flex-1 bg-surface-container/60 border border-border-base text-on-surface rounded-2xl hover:bg-surface-container py-3 cursor-pointer text-xs uppercase tracking-wider font-bold"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex-1 bg-primary-fixed hover:brightness-110 text-on-primary-fixed border-none font-bold py-3 rounded-2xl disabled:opacity-60 shadow-md flex items-center justify-center gap-1.5"
              >
                {justAdded ? "Added ✓" : addingToCart ? "Adding..." : `Add · ${formatINR(
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

      {/* Floating bill postpaid session link FAB */}
      {showTableSessionFab && (
        <div className="fixed bottom-6 right-5 z-50">
          <Link to={`/public/w/${outletSlug}/table-session`}>
            <button
              type="button"
              className="bg-[color-mix(in_srgb,var(--color-brand-accent)_100%,transparent)] hover:brightness-110 text-white font-extrabold px-5 py-4 rounded-full shadow-[0_12px_28px_-6px_color-mix(in_srgb,var(--color-brand-accent)_45%,transparent)] flex items-center gap-2 text-xs uppercase tracking-wider transition-all cursor-pointer border-none scale-100 hover:scale-[1.03] active:scale-95"
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