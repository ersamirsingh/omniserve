import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  getPublicMenuApi, 
  createOrUpdateCartApi, 
  updateCartApi,
  removeFromCartApi,
  getCartApi,
  updateGuestSessionApi,
  leaveGuestSessionApi
} from "../../api/models/public.api";
import Spinner from "../../components/ui/Spinner";
import Input from "../../components/ui/Input";
import RestaurantHeader from "../../components/guest/RestaurantHeader";
import OutletBanner from "../../components/guest/OutletBanner";
import CategoryChips from "../../components/guest/CategoryChips";
import MenuCard from "../../components/guest/MenuCard";
import VariantCustomizerSheet from "../../components/guest/VariantCustomizerSheet";
import { useSocket } from "../../context/SocketContext";
import { 
  HiOutlineUserCircle, 
  HiOutlineSparkles,
  HiOutlineArrowRightOnRectangle,
  HiOutlineShoppingBag,
  HiChevronRight
} from "react-icons/hi2";

export default function MenuPage() {
  const { outletSlug } = useParams();
  const navigate = useNavigate();
  const { lastMessage } = useSocket();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Custom Filters state
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'veg' | 'non-veg' | 'bestseller' | 'recommended'

  // Selected customization item
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemVariants, setItemVariants] = useState([]);
  const [itemAddons, setItemAddons] = useState([]);
  const [addingToCart, setAddingToCart] = useState(false);

  // Cart local state
  const [cart, setCart] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);

  // Welcome Overlay states
  const [showWelcome, setShowWelcome] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [updatingGuest, setUpdatingGuest] = useState(false);

  const guestSessionToken = localStorage.getItem("guestSessionToken");
  
  // Category references for scrolling
  const categoryRefs = useRef({});
  const isScrollingRef = useRef(false);

  // 1. Fetch Cart details
  const fetchCartDetails = async () => {
    if (!guestSessionToken) return;
    try {
      const res = await getCartApi();
      setCart(res.data.data);
    } catch (err) {
      console.warn("Failed to retrieve guest cart:", err.message);
    }
  };

  // 2. Fetch Menu details
  const fetchMenuData = () => {
    if (!outletSlug) return;
    setLoading(true);
    getPublicMenuApi(outletSlug)
      .then((res) => {
        const payload = res.data.data;
        setData(payload);
        
        // Do not auto-show welcome overlay on menu page anymore (handled in QRRedirectPage)
        setShowWelcome(false);
        setError(null);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load restaurant menu");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchMenuData();
    fetchCartDetails();
  }, [outletSlug, guestSessionToken]);

  // 3. Listen to Real-time WebSockets Sold Out/Availability updates
  useEffect(() => {
    if (lastMessage) {
      const { event, payload } = lastMessage;
      if (event === "INVENTORY_CHANGED" || event === "MENU_CHANGED") {
        console.log("[MenuPage] WebSocket update received, refreshing catalog...");
        // Refresh catalog data silently to sync item availability statuses
        getPublicMenuApi(outletSlug)
          .then((res) => {
            setData(res.data.data);
          })
          .catch((err) => console.warn("Silent menu sync failed:", err.message));
      }
    }
  }, [lastMessage, outletSlug]);

  // 4. Welcome Form updates
  const handleWelcomeSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!guestName.trim()) return;

    setUpdatingGuest(true);
    try {
      await updateGuestSessionApi({
        name: guestName.trim(),
        phone: guestPhone.trim() || undefined
      });
      setShowWelcome(false);
      fetchMenuData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update guest details");
    } finally {
      setUpdatingGuest(false);
    }
  };

  const handleWelcomeSkip = async () => {
    setUpdatingGuest(true);
    try {
      await updateGuestSessionApi({
        name: "Guest",
        phone: "Unknown"
      });
      setShowWelcome(false);
      fetchMenuData();
    } catch (err) {
      setShowWelcome(false);
    } finally {
      setUpdatingGuest(false);
    }
  };

  const handleLeaveSession = async () => {
    if (!window.confirm("Are you sure you want to leave this table session? Your current cart items will be closed.")) return;
    try {
      await leaveGuestSessionApi();
      localStorage.removeItem("sessionToken");
      localStorage.removeItem("guestSessionToken");
      localStorage.removeItem("selectedOutletId");
      navigate("/");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to leave table session");
    }
  };

  // 5. Scroll tracking for Active Category Chips
  useEffect(() => {
    if (loading || !data) return;

    const observerOptions = {
      root: null,
      rootMargin: "-80px 0px -60% 0px",
      threshold: 0
    };

    const handleIntersection = (entries) => {
      if (isScrollingRef.current) return;
      
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const categoryId = entry.target.getAttribute("data-category-id");
          if (categoryId) {
            setSelectedCategory(categoryId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    // Observe all category section headers
    data.categories.forEach((cat) => {
      const el = categoryRefs.current[cat._id];
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, [loading, data]);

  const handleSelectCategory = (categoryId) => {
    setSelectedCategory(categoryId);
    isScrollingRef.current = true;

    const targetEl = categoryRefs.current[categoryId];
    if (targetEl) {
      const offset = 140; // sticky header + category chips offset
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = targetEl.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });

      // Release scroll block after animation completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    } else {
      isScrollingRef.current = false;
    }
  };

  // 6. Cart item modifiers (stepper callbacks)
  const getQuantityForMenuItem = (menuItemId) => {
    if (!cart || !cart.items) return 0;
    // Sum up quantity of all configurations for this menuItemId
    return cart.items
      .filter((item) => (item.menuItemId._id || item.menuItemId) === menuItemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  };

  const handleStepperUpdate = async (item, delta) => {
    if (!cart) return;
    setCartLoading(true);

    // Find the cart item configuration matching this menuItemId
    const matchingItems = cart.items.filter(
      (ci) => (ci.menuItemId._id || ci.menuItemId) === item._id
    );

    if (matchingItems.length === 0) {
      setCartLoading(false);
      return;
    }

    // Update the last added configuration
    const targetCartItem = matchingItems[matchingItems.length - 1];
    const newQty = targetCartItem.quantity + delta;

    try {
      if (newQty <= 0) {
        // If total quantity becomes 0, remove this configuration
        const res = await removeFromCartApi(
          cart._id,
          targetCartItem.menuItemId._id || targetCartItem.menuItemId,
          targetCartItem.variantId?._id ? { variantId: targetCartItem.variantId._id } : {}
        );
        setCart(res.data.data);
      } else {
        const res = await updateCartApi(cart._id, {
          item: {
            menuItemId: targetCartItem.menuItemId._id || targetCartItem.menuItemId,
            variantId: targetCartItem.variantId?._id || undefined,
            quantity: newQty,
            notes: targetCartItem.notes || undefined
          }
        });
        setCart(res.data.data);
      }
    } catch (err) {
      console.warn("Stepper update failed:", err.message);
    } finally {
      setCartLoading(false);
    }
  };

  const handleAddClick = (item) => {
    // If variants or addons exist, open the sheet customizer, otherwise add directly
    const hasVariants = variants.some(v => v.menuItemId === item._id);
    const hasAddons = addons.some(a => a.menuItemId === item._id);

    if (hasVariants || hasAddons) {
      handleOpenItemConfig(item);
    } else {
      handleAddDirectly(item);
    }
  };

  const handleAddDirectly = async (item) => {
    setCartLoading(true);
    const payload = {
      sessionToken: guestSessionToken,
      outletId: outlet.id,
      item: {
        menuItemId: item._id,
        quantity: 1
      }
    };
    try {
      const res = await createOrUpdateCartApi(payload);
      setCart(res.data.data);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add item to cart");
    } finally {
      setCartLoading(false);
    }
  };

  const handleOpenItemConfig = (item) => {
    const activeVariants = variants.filter((v) => v.menuItemId === item._id);
    const activeAddons = addons.filter((a) => a.menuItemId === item._id);
    
    setItemVariants(activeVariants);
    setItemAddons(activeAddons);
    setSelectedItem(item);
  };

  const handleConfirmCustomizer = async (config) => {
    if (!selectedItem) return;
    setAddingToCart(true);

    const payload = {
      sessionToken: guestSessionToken,
      outletId: outlet.id,
      item: {
        menuItemId: selectedItem._id,
        variantId: config.variantId,
        addons: config.addons,
        quantity: config.quantity,
        notes: config.notes
      }
    };

    try {
      const res = await createOrUpdateCartApi(payload);
      setCart(res.data.data);
      setSelectedItem(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to customize item");
    } finally {
      setAddingToCart(false);
    }
  };

  // 7. Dynamic local item filtering & search memoizations
  const filteredMenuItems = useMemo(() => {
    if (!data) return [];
    
    return data.menuItems.filter((item) => {
      // Search matches
      const matchesSearch = searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.tags && item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));

      // Filter matches
      let matchesFilter = true;
      if (activeFilter === "veg") matchesFilter = item.isVeg === true;
      if (activeFilter === "non-veg") matchesFilter = item.isVeg === false;
      if (activeFilter === "bestseller") matchesFilter = item.isBestseller === true;
      if (activeFilter === "recommended") matchesFilter = item.isRecommended === true;

      return matchesSearch && matchesFilter;
    });
  }, [data, searchQuery, activeFilter]);

  // Chefs Recommendation Rails
  const recommendedItems = useMemo(() => {
    if (!data) return [];
    return data.menuItems.filter(item => item.isRecommended || item.isBestseller).slice(0, 5);
  }, [data]);

  // Aggregate quantities
  const totalCartCount = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const totalCartPrice = useMemo(() => {
    if (!cart || !cart.items) return 0;
    return cart.items.reduce((sum, item) => {
      const itemPrice = item.variantId?.price || item.menuItemId?.price || 0;
      const addonsPrice = (item.addons || []).reduce((acc, ad) => acc + (ad.addonId?.price || ad.price || 0) * (ad.quantity || 1), 0);
      return sum + (itemPrice + addonsPrice) * item.quantity;
    }, 0);
  }, [cart]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-zinc-900 guest-ordering">
        <Spinner size="lg" className="text-[#6311f4]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-zinc-950 p-6 text-center space-y-4 guest-ordering">
        <h2 className="text-xl font-black text-rose-500">Failed to Load Menu</h2>
        <p className="text-zinc-500 text-xs max-w-xs">{error || "Something went wrong"}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-[#6311f4] text-white font-bold rounded-xl text-xs uppercase"
        >
          Return Home
        </button>
      </div>
    );
  }

  const { outlet, categories, variants, addons, guestSession, table, diningArea } = data;

  return (
    <div className="min-h-screen bg-white text-zinc-955 flex flex-col guest-ordering relative select-none pb-12">
      {/* Welcome Overlay Screen */}
      {showWelcome && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-md z-50 flex items-center justify-center p-5">
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-[#6311f4]/5 border border-[#6311f4]/10 rounded-2xl flex items-center justify-center mx-auto text-[#6311f4] text-2xl font-black">
                OS
              </div>
              <div>
                <h2 className="font-black text-xl text-zinc-950 tracking-tight">Welcome to {outlet.name}</h2>
                <p className="text-[11px] text-zinc-500 mt-0.5">{outlet.address || 'Table Self-Ordering'}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-[#6311f4]/5 border border-[#6311f4]/10 px-3 py-1 rounded-full text-[#6311f4] text-[10px] font-extrabold uppercase tracking-wider">
                Table {table?.tableNumber || 'N/A'} • {diningArea?.name || 'Dine-In'}
              </div>
            </div>

            <form onSubmit={handleWelcomeSubmit} className="space-y-4">
              <Input
                label="Your Name"
                placeholder="Enter your name (e.g. John)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                required
                icon="person"
                className="bg-zinc-50 border-zinc-100 text-zinc-900 text-xs focus:border-[#6311f4]"
              />

              <Input
                label="Phone Number (Optional)"
                placeholder="Enter phone number"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                icon="phone"
                type="tel"
                className="bg-zinc-50 border-zinc-100 text-zinc-900 text-xs focus:border-[#6311f4]"
              />

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={handleWelcomeSkip}
                  disabled={updatingGuest}
                  className="flex-1 bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 text-zinc-500 font-bold text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all cursor-pointer"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={updatingGuest || !guestName.trim()}
                  className="flex-1 bg-[#6311f4] hover:bg-[#520dd4] text-white font-black text-xs uppercase tracking-wider py-3.5 rounded-xl shadow-lg shadow-[#6311f4]/15 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {updatingGuest ? 'Joining...' : 'Start Ordering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Brand Header Component */}
      <RestaurantHeader
        outletName={outlet.name}
        outletAddress={outlet.address}
        tableNumber={table?.tableNumber}
        guestCount={guestSession?.guestCount}
        cartItemsCount={totalCartCount}
        cartLink={`/public/w/${outletSlug}/cart`}
      />

      <div className="flex-grow max-w-2xl w-full mx-auto p-4 space-y-6 pb-28">
        {/* Banner Details */}
        <OutletBanner
          outletName={outlet.name}
          tableNumber={table?.tableNumber}
          guestsCount={guestSession?.guestCount}
          onCallWaiter={() => alert("Assistance request sent to waiter.")}
        />

        {/* Dynamic offers banner placeholder */}
        <div className="bg-gradient-to-r from-[#6311f4]/5 to-purple-500/5 border border-[#6311f4]/10 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[18px]">🏷️</span>
            <div>
              <p className="text-[11px] font-black text-zinc-800">Get 10% OFF up to ₹100</p>
              <p className="text-[9px] text-[#6311f4] font-bold">Use Coupon: OMNISERVE10</p>
            </div>
          </div>
          <span className="text-zinc-300 text-xs">✨ Dine-In Only</span>
        </div>

        {/* Pinned Search and Filters bar */}
        <div className="sticky top-[68px] bg-white z-30 space-y-3 pt-2 pb-1 border-b border-zinc-100">
          <div className="relative">
            <input
              type="text"
              placeholder="Search dishes, descriptions, categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-100 text-zinc-900 placeholder-zinc-400 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#6311f4]/40"
            />
          </div>

          <CategoryChips
            categories={categories}
            selectedCategoryId={selectedCategory}
            onSelectCategory={handleSelectCategory}
          />

          {/* Veg/Non-Veg sub filters chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all', label: 'All Items' },
              { id: 'veg', label: '🟢 Veg Only' },
              { id: 'non-veg', label: '🔴 Non-Veg' },
              { id: 'bestseller', label: '⭐ Bestseller' },
              { id: 'recommended', label: '👍 Chef Picks' }
            ].map((filt) => (
              <button
                key={filt.id}
                onClick={() => setActiveFilter(filt.id)}
                className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  activeFilter === filt.id
                    ? 'bg-[#6311f4]/10 border-[#6311f4]/20 text-[#6311f4]'
                    : 'bg-white border-zinc-100 text-zinc-600 hover:border-zinc-200'
                }`}
              >
                {filt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Chefs Recommendation / Popular Rail */}
        {recommendedItems.length > 0 && searchQuery.trim() === "" && activeFilter === "all" && (
          <div className="space-y-3">
            <h3 className="font-extrabold text-[14px] text-zinc-900 tracking-tight flex items-center gap-1">
              <span>🔥</span>
              <span>Popular & Chef Picks</span>
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {recommendedItems.map((item) => (
                <div 
                  key={item._id} 
                  onClick={() => handleAddClick(item)}
                  className="bg-white border border-zinc-100 rounded-2xl p-3 shrink-0 w-40 space-y-2 cursor-pointer hover:shadow-xs transition-all relative"
                >
                  <div className="w-full h-24 rounded-xl overflow-hidden relative bg-zinc-50 border border-zinc-100/60">
                    <img 
                      src={item.imageUrl || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f7f5fa"/><text x="50%" y="50%" font-size="12" font-family="sans-serif" font-weight="bold" fill="%23c8c8d5" dominant-baseline="middle" text-anchor="middle">Food</text></svg>`} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-1.5 left-1.5">
                      <div className={item.isVeg ? 'veg-dot bg-white scale-75' : 'nonveg-dot bg-white scale-75'}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="font-bold text-xs text-zinc-900 line-clamp-1">{item.name}</h4>
                    <span className="text-xs font-black text-zinc-950">₹{item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Categories List Scroll Sections */}
        <div className="space-y-8">
          {categories.map((cat) => {
            const itemsInCat = filteredMenuItems.filter(item => item.categoryId === cat._id);
            if (itemsInCat.length === 0) return null;

            return (
              <section 
                key={cat._id}
                ref={(el) => (categoryRefs.current[cat._id] = el)}
                data-category-id={cat._id}
                className="space-y-4 pt-4 border-t border-zinc-100/50"
              >
                <div>
                  <h2 className="font-black text-base text-zinc-900 tracking-tight">{cat.name}</h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{itemsInCat.length} Dishes available</p>
                </div>

                <div className="space-y-4">
                  {itemsInCat.map((item) => (
                    <MenuCard
                      key={item._id}
                      item={item}
                      quantityInCart={getQuantityForMenuItem(item._id)}
                      onAddClick={() => handleAddClick(item)}
                      onUpdateQty={(delta) => handleStepperUpdate(item, delta)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-45 animate-bounce-short">
          <Link 
            to={`/public/w/${outletSlug}/cart`}
            className="bg-[#6311f4] hover:bg-[#520dd4] text-white flex items-center justify-between p-4.5 rounded-2xl shadow-xl shadow-[#6311f4]/20 transition-all active:scale-98 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                <HiOutlineShoppingBag className="w-5.5 h-5.5 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-purple-100 uppercase tracking-wider">{totalCartCount} {totalCartCount === 1 ? 'Item' : 'Items'} added</p>
                <p className="text-sm font-black text-white">₹{totalCartPrice} plus taxes</p>
              </div>
            </div>
            <div className="flex items-center gap-1 font-black text-xs uppercase tracking-wider">
              <span>View Cart</span>
              <HiChevronRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}

      {/* Variant customizer pop-up */}
      {selectedItem && (
        <VariantCustomizerSheet
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
          variants={itemVariants}
          addons={itemAddons}
          onConfirm={handleConfirmCustomizer}
          confirmLoading={addingToCart}
        />
      )}

      {/* Floating Leave Table Action */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={handleLeaveSession}
          className="bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 font-extrabold px-4.5 py-3 rounded-full shadow-lg flex items-center gap-1.5 text-[10px] uppercase tracking-wider transition-all cursor-pointer"
        >
          <HiOutlineArrowRightOnRectangle className="w-4 h-4 text-rose-500" />
          <span>Leave Table</span>
        </button>
      </div>
    </div>
  );
}
