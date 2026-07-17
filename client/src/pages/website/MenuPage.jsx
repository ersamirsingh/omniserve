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

/* ── Category emoji map ── */
const CATEGORY_ICONS = {
  starter: "🥗", starters: "🥗", appetizer: "🥗", appetizers: "🥗", appetiser: "🥗", appetisers: "🥗",
  "main course": "🍛", mains: "🍛", "main courses": "🍛", entree: "🍛", entrees: "🍛",
  pizza: "🍕", pizzas: "🍕",
  burger: "🍔", burgers: "🍔",
  pasta: "🍝", pastas: "🍝", noodle: "🍝", noodles: "🍝",
  dessert: "🍰", desserts: "🍰", sweet: "🍰", sweets: "🍰",
  beverage: "🥤", beverages: "🥤", drink: "🥤", drinks: "🥤", juice: "🥤", juices: "🥤", shake: "🥤", shakes: "🥤", smoothie: "🥤", smoothies: "🥤", coffee: "☕", tea: "☕",
  biryani: "🍚", biryanis: "🍚", rice: "🍚",
  soup: "🥣", soups: "🥣",
  salad: "🥗", salads: "🥗",
  bread: "🫓", breads: "🫓", roti: "🫓", naan: "🫓",
  seafood: "🦐", fish: "🐟",
  chicken: "🍗", kebab: "🍢", kebabs: "🍢",
  sandwich: "🥪", sandwiches: "🥪", wrap: "🌯", wraps: "🌯",
  thali: "🍽️", combo: "🍱", combos: "🍱",
  ice_cream: "🍦", "ice cream": "🍦",
};

const getCategoryIcon = (name) => {
  const key = (name || "").toLowerCase().trim();
  return CATEGORY_ICONS[key] || "🍽️";
};

/* ── Ambiance banner data ── */
const AMBIANCE_IMAGES = [
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=1200&q=80",
];
const AMBIANCE_TEXTS = [
  "Crafted with passion",
  "Farm to table freshness",
  "Savor every bite",
  "A feast for the senses",
];

/* ── CSS keyframes injected via style tag ── */
const MENU_KEYFRAMES = `
@keyframes menuFadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes menuBounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(10px); }
}
@keyframes menuPulseRing {
  0%   { box-shadow: 0 0 0 0 rgba(99, 17, 244, 0.5); }
  70%  { box-shadow: 0 0 0 10px rgba(99, 17, 244, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 17, 244, 0); }
}
@keyframes menuSlideUp {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to   { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes menuLivePulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
@keyframes menuArrowBounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0) translateX(-50%); }
  40%  { transform: translateY(-8px) translateX(-50%); }
  60%  { transform: translateY(-4px) translateX(-50%); }
}
@keyframes menuFabEntrance {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}
`;

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
  const categoryNavRef = useRef(null);

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

  // ─── Scroll active category card into view ───
  useEffect(() => {
    if (!categoryNavRef.current) return;
    const activeBtn = categoryNavRef.current.querySelector('[data-cat-active="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [selectedCategory]);

  /* ════════════════════════════════════════════════════════════════
     RENDER: Item Card (redesigned)
     ════════════════════════════════════════════════════════════════ */
  const renderItemCard = (item, index) => (
    <div
      key={item._id}
      onClick={() => handleOpenItemConfig(item)}
      className="group bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 dark:hover:shadow-purple-500/10 hover:border-[#6311f4]/30 active:scale-[0.98] relative flex flex-col"
      style={{ animation: `menuFadeUp 0.5s ease ${Math.min(index * 0.06, 0.4)}s both` }}
    >
      {/* Image area — 3:2 aspect ratio */}
      <div className="relative aspect-[3/2] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {item.image ? (
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-zinc-300 dark:text-zinc-600">
            🍽️
          </div>
        )}

        {/* Gradient overlay for price */}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Price on image */}
        <span className="absolute bottom-2.5 left-3 text-white font-black text-base tabular-nums drop-shadow-lg">
          {formatINR(item.price)}
        </span>

        {/* Veg/Non-veg badge — top-left */}
        {typeof item.isVeg === "boolean" && (
          <span
            className={`absolute top-2.5 left-2.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shadow-md ${
              item.isVeg
                ? "border-emerald-400 bg-emerald-500"
                : "border-red-400 bg-red-500"
            }`}
            aria-label={item.isVeg ? "Vegetarian" : "Non-vegetarian"}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
          </span>
        )}

        {/* Bestseller / New / Chef's Pick ribbon — top-right */}
        {(item.isBestseller || item.isNew || item.isChefSpecial) && (
          <span className="absolute top-2.5 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-l-full shadow-lg">
            {item.isBestseller ? "★ Bestseller" : item.isChefSpecial ? "👨‍🍳 Chef's Pick" : "✨ New"}
          </span>
        )}

        {/* Quick add floating button — bottom-right */}
        <button
          type="button"
          className="absolute bottom-2 right-2.5 bg-white dark:bg-zinc-900 text-[#6311f4] dark:text-[#a07cff] w-9 h-9 rounded-full flex items-center justify-center text-lg font-black shadow-lg border border-zinc-200 dark:border-zinc-700 transition-all duration-200 hover:scale-110 active:scale-90 hover:bg-[#6311f4] hover:text-white hover:border-[#6311f4]"
          onClick={(e) => { e.stopPropagation(); handleOpenItemConfig(item); }}
          aria-label={`Add ${item.name}`}
        >
          +
        </button>
      </div>

      {/* Text area */}
      <div className="p-3.5 flex flex-col gap-1 flex-1">
        <h3 className="font-extrabold text-zinc-900 dark:text-zinc-50 text-sm leading-snug tracking-tight line-clamp-1">
          {item.name}
        </h3>
        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
          {item.description || "Fresh and prepared with premium ingredients."}
        </p>
        <div className="flex items-center gap-2.5 mt-auto pt-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold">
          {typeof item.rating === "number" && (
            <span className="flex items-center gap-0.5 text-amber-500">
              ★ <span className="text-zinc-500 dark:text-zinc-400 font-bold">{item.rating.toFixed(1)}</span>
            </span>
          )}
          {item.prepTimeMinutes && (
            <span className="flex items-center gap-0.5">
              <span>🕐</span> {item.prepTimeMinutes} mins
            </span>
          )}
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════════════════════════════
     LOADING STATE
     ════════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <style>{MENU_KEYFRAMES}</style>
        {/* Hero skeleton */}
        <div className="h-[60vh] md:h-[50vh] bg-zinc-200 dark:bg-zinc-900 animate-pulse" />
        {/* Category skeleton */}
        <div className="flex gap-3 px-5 py-4 overflow-hidden">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 w-20 shrink-0 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
        {/* Card skeleton */}
        <div className="px-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" style={{ aspectRatio: '3/2.8' }} />
          ))}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     ERROR STATE
     ════════════════════════════════════════════════════════════════ */
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-6 font-sans">
        <style>{MENU_KEYFRAMES}</style>
        <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-950/30 text-red-500 flex items-center justify-center text-3xl mb-5">
          ⚠️
        </div>
        <h2 className="text-xl font-bold mb-2">Couldn't load the menu</h2>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-7 text-center max-w-xs">
          {error || "Something went wrong on our end."}
        </p>
        <Link to="/login">
          <Button variant="primary" className="bg-[#6311f4] hover:bg-[#520dd4] text-white border-none font-semibold rounded-xl">
            Return to Admin Login
          </Button>
        </Link>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════════════
     MAIN RENDER
     ════════════════════════════════════════════════════════════════ */
  const joinCode = localStorage.getItem("joinCode");
  const hasActiveSession =
    localStorage.getItem("sessionToken") && !localStorage.getItem("sessionToken").startsWith("WEB-SESS-");

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans">
      <style>{MENU_KEYFRAMES}</style>

      {/* ═══════════════ HERO — Ambient Video ═══════════════ */}
      <div className="relative h-[60vh] md:h-[50vh] w-full overflow-hidden shrink-0">
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover scale-105"
          poster="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=80"
        >
          <source src="https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4" type="video/mp4" />
        </video>

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

        {/* Top actions */}
        <div className="absolute top-4 left-5 right-5 flex justify-between items-center z-10">
          <Link
            to="/login"
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all text-sm"
          >
            ←
          </Link>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowPhysicalMenu(true)}
              className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/15 px-3.5 py-2 rounded-full text-white text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              <HiOutlineBookOpen className="text-sm" />
              <span>Menu Card</span>
            </button>
            <Link
              to={`/public/w/${outletSlug}/cart`}
              className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white hover:bg-white/20 transition-all"
            >
              <span className="text-base">🛒</span>
              {cartAddedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-full bg-[#6311f4] text-white shadow-lg">
                  {cartAddedCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Hero text — animated entrance */}
        <div
          className="absolute bottom-20 left-5 right-5 md:left-8 md:right-8 z-10"
          style={{ animation: "menuFadeUp 0.8s ease 0.2s both" }}
        >
          <div className="flex items-center gap-3.5 mb-3">
            {outlet?.logoUrl ? (
              <img
                src={outlet.logoUrl}
                alt={outlet.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white/25 shadow-xl shrink-0 bg-white"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#6311f4] text-white flex items-center justify-center font-black text-xl border-2 border-white/25 shadow-xl shrink-0">
                {outlet?.name?.charAt(0) || "F"}
              </div>
            )}
            <div>
              <h1 className="text-white font-black text-2xl md:text-3xl leading-tight drop-shadow-xl tracking-tight">
                {outlet?.name}
              </h1>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mt-0.5">
                {outlet?.cuisine || "Modern Dining Experience"}
              </p>
            </div>
          </div>
          {typeof outlet?.rating === "number" && (
            <div className="flex items-center gap-1 text-amber-400 text-sm font-bold">
              {"★".repeat(Math.round(outlet.rating))}
              <span className="text-white/50 text-xs ml-1">{outlet.rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Glassmorphism session info card */}
        {(table?.number || hasActiveSession) && (
          <div
            className="absolute bottom-20 right-5 md:right-8 z-10 hidden md:flex"
            style={{ animation: "menuFadeUp 0.8s ease 0.4s both" }}
          >
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-3.5 shadow-2xl flex flex-col gap-2 min-w-[180px]">
              {table?.number && (
                <div className="flex items-center gap-2 text-white text-xs font-bold">
                  <span className="text-sm">🪑</span>
                  <span>Table {table.number}</span>
                  {table.area && (
                    <span className="text-white/50 font-medium">· {table.area}</span>
                  )}
                </div>
              )}
              {joinCode && (
                <div className="flex items-center gap-2 text-white text-xs">
                  <span className="text-sm">🔑</span>
                  <span className="font-mono font-bold tracking-widest">{joinCode}</span>
                </div>
              )}
              {hasActiveSession && (
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400"
                    style={{ animation: "menuLivePulse 2s ease-in-out infinite" }}
                  />
                  <span className="text-emerald-300 font-bold uppercase tracking-wider text-[10px]">Live Session</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile session card — shown below hero text on small screens */}
        {(table?.number || hasActiveSession) && (
          <div
            className="absolute bottom-20 left-5 right-5 z-10 md:hidden"
            style={{ animation: "menuFadeUp 0.8s ease 0.5s both" }}
          >
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-3 mt-3 flex-wrap">
              {table?.number && (
                <span className="text-white text-[10px] font-bold uppercase tracking-wider bg-white/10 px-2.5 py-1 rounded-full">
                  🪑 Table {table.number}{table.area ? ` · ${table.area}` : ""}
                </span>
              )}
              {joinCode && (
                <span className="text-white text-[10px] font-mono font-bold tracking-widest bg-white/10 px-2.5 py-1 rounded-full">
                  🔑 {joinCode}
                </span>
              )}
              {hasActiveSession && (
                <span className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-400 inline-block"
                    style={{ animation: "menuLivePulse 2s ease-in-out infinite" }}
                  />
                  <span className="text-emerald-300 font-bold uppercase tracking-wider">Live</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bouncing explore arrow */}
        <div
          className="absolute bottom-4 left-1/2 z-10 text-white/50 flex flex-col items-center gap-1 cursor-pointer hover:text-white/80 transition-colors"
          style={{ animation: "menuArrowBounce 2s ease infinite" }}
          onClick={() => {
            const el = document.getElementById("menu-content-area");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">Explore Menu</span>
          <span className="text-lg">↓</span>
        </div>
      </div>

      {/* ═══════════════ STICKY CATEGORY NAV — Card style ═══════════════ */}
      {!isSearching && groupedSections.length > 0 && (
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-100 dark:border-zinc-800/60">
          <div
            ref={categoryNavRef}
            className="flex gap-2.5 px-4 py-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {/* "All" card */}
            <button
              type="button"
              data-cat-active={selectedCategory === "all" ? "true" : "false"}
              onClick={() => handleCategoryClick("all")}
              className={`shrink-0 flex flex-col items-center justify-center w-[72px] py-2.5 rounded-2xl transition-all duration-300 cursor-pointer border ${
                selectedCategory === "all"
                  ? "bg-[#6311f4]/10 dark:bg-[#6311f4]/20 border-[#6311f4] shadow-md shadow-[#6311f4]/10 scale-105"
                  : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600"
              }`}
            >
              <span className="text-2xl mb-0.5">🍽️</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider leading-tight ${
                selectedCategory === "all" ? "text-[#6311f4]" : "text-zinc-500 dark:text-zinc-400"
              }`}>
                All
              </span>
              <span className={`text-[9px] font-semibold mt-0.5 ${
                selectedCategory === "all" ? "text-[#6311f4]/70" : "text-zinc-400 dark:text-zinc-500"
              }`}>
                {menuItems.length}
              </span>
            </button>

            {groupedSections.map((cat) => (
              <button
                type="button"
                key={cat._id}
                data-cat-active={selectedCategory === cat._id ? "true" : "false"}
                onClick={() => handleCategoryClick(cat._id)}
                className={`shrink-0 flex flex-col items-center justify-center w-[72px] py-2.5 rounded-2xl transition-all duration-300 cursor-pointer border ${
                  selectedCategory === cat._id
                    ? "bg-[#6311f4]/10 dark:bg-[#6311f4]/20 border-[#6311f4] shadow-md shadow-[#6311f4]/10 scale-105"
                    : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600"
                }`}
              >
                <span className="text-2xl mb-0.5">{getCategoryIcon(cat.name)}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider leading-tight line-clamp-1 text-center max-w-full px-1 ${
                  selectedCategory === cat._id ? "text-[#6311f4]" : "text-zinc-500 dark:text-zinc-400"
                }`}>
                  {cat.name}
                </span>
                <span className={`text-[9px] font-semibold mt-0.5 ${
                  selectedCategory === cat._id ? "text-[#6311f4]/70" : "text-zinc-400 dark:text-zinc-500"
                }`}>
                  {itemCountByCategory[cat._id]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════ STICKY SEARCH BAR ═══════════════ */}
      <div
        id="menu-content-area"
        className="sticky top-[88px] z-20 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-zinc-100/80 dark:border-zinc-800/40 px-4 py-3"
      >
        <div className="relative max-w-3xl mx-auto">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 text-base pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search delicious dishes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search dishes"
            className="w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-[#6311f4] focus:ring-2 focus:ring-[#6311f4]/20 rounded-2xl pl-11 pr-10 py-3 text-sm font-medium outline-none transition-all shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-xs cursor-pointer"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ═══════════════ MAIN CONTENT ═══════════════ */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-6 py-6 flex flex-col gap-8">
        {isSearching ? (
          /* ── Search results ── */
          <div className="flex flex-col gap-5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
              {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for "{searchQuery}"
            </p>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.map((item, i) => renderItemCard(item, i))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center text-center gap-3">
                <span className="text-5xl opacity-40">🔍</span>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">No dishes match "{searchQuery}".</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold text-[#6311f4] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        ) : groupedSections.length === 0 ? (
          /* ── Empty menu ── */
          <div className="py-20 flex flex-col items-center text-center gap-3">
            <span className="text-5xl opacity-40">🍽️</span>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">The menu isn't set up yet. Please check back soon.</p>
          </div>
        ) : (
          /* ── Category sections with ambiance banners ── */
          groupedSections.map((cat, sectionIndex) => (
            <React.Fragment key={cat._id}>
              {/* Ambiance banner — after every 2 category sections */}
              {sectionIndex > 0 && sectionIndex % 2 === 0 && (
                <div className="relative w-full h-[200px] rounded-2xl overflow-hidden -mx-0 my-2">
                  <img
                    src={AMBIANCE_IMAGES[(Math.floor(sectionIndex / 2) - 1) % AMBIANCE_IMAGES.length]}
                    alt="Ambiance"
                    className="w-full h-full object-cover"
                    style={{ backgroundAttachment: "fixed" }}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-white text-xl md:text-2xl font-black tracking-tight italic drop-shadow-xl text-center px-6">
                      "{AMBIANCE_TEXTS[(Math.floor(sectionIndex / 2) - 1) % AMBIANCE_TEXTS.length]}"
                    </p>
                  </div>
                </div>
              )}

              <section
                data-category-id={cat._id}
                ref={(el) => (sectionRefs.current[cat._id] = el)}
                className="scroll-mt-40"
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{getCategoryIcon(cat.name)}</span>
                    <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                      {cat.name}
                    </h2>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800/60 px-3 py-1 rounded-full">
                    {cat.items.length} item{cat.items.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Items grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cat.items.map((item, i) => renderItemCard(item, i))}
                </div>
              </section>
            </React.Fragment>
          ))
        )}
      </div>

      {/* ═══════════════ ITEM CUSTOMIZER MODAL ═══════════════ */}
      {selectedItem && (
        <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem.name} size="md">
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1 text-zinc-900 dark:text-zinc-100 font-sans">
            {/* Item image in modal */}
            {selectedItem.image && (
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative shadow-inner">
                <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent" />
              </div>
            )}

            {/* Price */}
            <div>
              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-1 font-bold">Base Price</span>
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tabular-nums">{formatINR(selectedItem.price)}</span>
            </div>

            {/* Description */}
            {selectedItem.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 p-3.5 rounded-xl border border-zinc-100 dark:border-zinc-800 leading-relaxed">
                {selectedItem.description}
              </p>
            )}

            {/* Variants */}
            {itemVariants.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-widest">Choose Variant</h4>
                <div className="space-y-2">
                  {itemVariants.map((v) => (
                    <label
                      key={v._id}
                      className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-all border ${
                        selectedVariantId === v._id
                          ? "bg-[#6311f4]/5 dark:bg-[#6311f4]/10 border-[#6311f4]/40"
                          : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 hover:border-[#6311f4]/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="item-variant"
                          value={v._id}
                          checked={selectedVariantId === v._id}
                          onChange={() => setSelectedVariantId(v._id)}
                          className="w-4 h-4 accent-[#6311f4]"
                        />
                        <span className="text-sm font-semibold">{v.name}</span>
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
                <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-3 uppercase tracking-widest">Add Extra Addons</h4>
                <div className="space-y-2">
                  {itemAddons.map((a) => {
                    const isSelected = !!selectedAddons[a._id];
                    const qty = selectedAddons[a._id] || 0;

                    return (
                      <div
                        key={a._id}
                        className={`flex items-center justify-between p-3.5 rounded-xl transition-all border ${
                          isSelected
                            ? "bg-[#6311f4]/5 dark:bg-[#6311f4]/10 border-[#6311f4]/40"
                            : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800 hover:border-[#6311f4]/30"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleAddon(a._id)}
                            className="w-4 h-4 accent-[#6311f4] rounded"
                          />
                          <span className="text-sm font-semibold">{a.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400 tabular-nums">{formatINR(a.price)}</span>
                          {isSelected && (
                            <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => handleAddonQty(a._id, -1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold rounded transition-colors"
                                aria-label={`Decrease ${a.name} quantity`}
                              >
                                −
                              </button>
                              <span className="text-xs font-bold w-4 text-center tabular-nums">{qty}</span>
                              <button
                                type="button"
                                onClick={() => handleAddonQty(a._id, 1)}
                                className="w-6 h-6 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold rounded transition-colors"
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
            <div className="flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 pt-4">
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Quantity</span>
              <div className="flex items-center gap-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5">
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold rounded-lg transition-colors"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="font-bold w-6 text-center text-sm tabular-nums">{itemQuantity}</span>
                <button
                  type="button"
                  onClick={() => setItemQuantity((q) => q + 1)}
                  className="w-8 h-8 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 font-bold rounded-lg transition-colors"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest block mb-2">
                Special instructions
              </label>
              <textarea
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder="No onions, extra spicy, etc."
                className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 rounded-xl p-3.5 text-sm focus:outline-none focus:border-[#6311f4] focus:ring-2 focus:ring-[#6311f4]/20 h-20 resize-none transition-all"
              />
            </div>

            {/* Submit buttons */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3 sticky bottom-0 bg-white dark:bg-zinc-950 -mx-1 px-1 pb-1">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6311f4] to-[#8b5cf6] hover:from-[#520dd4] hover:to-[#7c3aed] text-white font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-[#6311f4]/25 active:scale-[0.98]"
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
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ═══════════════ PHYSICAL MENU CARD MODAL ═══════════════ */}
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

      {/* ═══════════════ FLOATING CART BAR ═══════════════ */}
      {cartAddedCount > 0 && (
        <div
          className="fixed bottom-6 left-1/2 z-40 w-full max-w-md px-5"
          style={{ animation: "menuSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both", transform: "translateX(-50%)" }}
        >
          <Link to={`/public/w/${outletSlug}/cart`} className="no-underline">
            <div className="bg-gradient-to-r from-[#6311f4] to-[#8b5cf6] hover:from-[#520dd4] hover:to-[#7c3aed] text-white px-5 py-4 rounded-2xl shadow-2xl shadow-[#6311f4]/30 flex items-center justify-between transition-all duration-200 active:scale-[0.97]">
              <div className="flex items-center gap-3">
                <span className="text-lg">🛒</span>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-black uppercase tracking-wider leading-none">View Cart</span>
                  <span className="text-[10px] text-white/70 leading-none mt-1 font-medium">
                    {cartAddedCount} item{cartAddedCount === 1 ? "" : "s"} added
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider group">
                <span>Go to Cart</span>
                <HiOutlineChevronRight className="text-sm transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* ═══════════════ TABLE SESSION FAB ═══════════════ */}
      {showTableSessionFab && (
        <div
          className={`fixed z-50 transition-all duration-300 ${cartAddedCount > 0 ? "bottom-28" : "bottom-6"} right-5`}
          style={{ animation: "menuFabEntrance 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both" }}
        >
          <Link to={`/public/w/${outletSlug}/table-session`}>
            <button
              type="button"
              className="relative bg-[#6311f4] hover:bg-[#520dd4] text-white font-extrabold px-5 py-3.5 rounded-full shadow-xl flex items-center gap-2.5 text-xs uppercase tracking-wider transition-all cursor-pointer border-none"
              style={{ animation: "menuPulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}
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