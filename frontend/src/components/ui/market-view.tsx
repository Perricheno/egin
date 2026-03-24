"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, ShoppingBasket, ShoppingCart, ChevronLeft, Plus, Minus, Trash2, X } from "lucide-react";
import { PlatformLanguage, ui, cropList, cropLabels } from "@/lib/i18n";

interface CartItem {
  listing: any;
  quantity: number;
}

type MarketSubView = "list" | "cart";
type SortMode = "none" | "asc" | "desc";

export default function MarketView({ language }: { language: PlatformLanguage }) {
  const t = ui[language];
  const [listings, setListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(t.all);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [subView, setSubView] = useState<MarketSubView>("list");
  const [showFilter, setShowFilter] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("none");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const fetchMarketData = async () => {
    try {
      const res = await fetch("http://localhost:3008/marketplace/listings");
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setListings(json.data.map((item: any) => ({
          ...item,
          crop: item.cropName || item.title || item.crop || t.culture,
          volume: item.quantity ? `${item.quantity} ${item.unit || "тонн"}` : t.notSpecified,
          price: item.price ? Number(item.price) : 0,
          priceLabel: item.price ? `${Number(item.price).toLocaleString()} ₸/${item.unit || "т"}` : t.negotiable,
          farmer: item.farmer?.fullName || "Продавец",
          region: item.location || "Казахстан",
          category: item.category || t.otherCrops,
        })));
      } else {
        setListings([
          { id: 1, crop: "Арбуз", volume: "10 тонн", price: 50000, priceLabel: "50 000 ₸/т", farmer: "Эдиль Т.", region: "Алматинская обл.", category: "Фрукты", unit: "т" },
          { id: 2, crop: "Картофель", volume: "5 тонн", price: 80000, priceLabel: "80 000 ₸/т", farmer: "Алибек С.", region: "Павлодарская обл.", category: "Овощи", unit: "т" },
          { id: 3, crop: "Пшеница", volume: "100 тонн", price: 120000, priceLabel: "120 000 ₸/т", farmer: "AgroFirm KZ", region: "Акмолинская обл.", category: "Зерновые", unit: "т" },
          { id: 4, crop: "Кукуруза", volume: "20 тонн", price: 95000, priceLabel: "95 000 ₸/т", farmer: "Канат Б.", region: "Костанайская обл.", category: "Зерновые", unit: "т" },
          { id: 5, crop: "Помидоры", volume: "3 тонн", price: 200000, priceLabel: "200 000 ₸/т", farmer: "Теплица KZ", region: "Туркестанская обл.", category: "Овощи", unit: "т" },
        ]);
      }
    } catch (err) {
      setListings([
        { id: 1, crop: "Арбуз", volume: "10 тонн", price: 50000, priceLabel: "50 000 ₸/т", farmer: "Эдиль Т.", region: "Алматинская обл.", category: "Фрукты", unit: "т" },
        { id: 2, crop: "Картофель", volume: "5 тонн", price: 80000, priceLabel: "80 000 ₸/т", farmer: "Алибек С.", region: "Павлодарская обл.", category: "Овощи", unit: "т" },
        { id: 3, crop: "Пшеница", volume: "100 тонн", price: 120000, priceLabel: "120 000 ₸/т", farmer: "AgroFirm KZ", region: "Акмолинская обл.", category: "Зерновые", unit: "т" },
      ]);
    }
  };

  useEffect(() => { fetchMarketData(); }, []);
  useEffect(() => { setActiveCategory(t.all); }, [t.all]);

  const getCropEmoji = (cropName: string) => {
    const found = cropList.find(c => {
      const labels = cropLabels[language] as any;
      return labels[c.key] === cropName;
    });
    return found?.emoji || "🌱";
  };

  const addToCart = (listing: any) => {
    setCart(prev => {
      const existing = prev.find(c => c.listing.id === listing.id);
      if (existing) {
        return prev.map(c => c.listing.id === listing.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { listing, quantity: 1 }];
    });
  };

  const updateCartQty = (listingId: string | number, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.listing.id === listingId) {
        const newQty = Math.max(1, c.quantity + delta);
        return { ...c, quantity: newQty };
      }
      return c;
    }));
  };

  const removeFromCart = (listingId: string | number) => {
    setCart(prev => prev.filter(c => c.listing.id !== listingId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.listing.price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckoutLoading(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch("http://localhost:3008/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: cart.map(c => ({
            listingId: String(c.listing.id),
            title: c.listing.crop,
            quantity: c.quantity,
            unit: c.listing.unit || "т",
            priceAtPurchase: c.listing.price,
          })),
        }),
      });
      if (res.ok) {
        setCart([]);
        setSubView("list");
        alert(t.orderSuccess);
      } else {
        alert("Ошибка при оформлении заказа");
      }
    } catch {
      alert("Не удалось связаться с сервером");
    } finally {
      setCheckoutLoading(false);
    }
  };

  let filteredListings = listings.filter(item => {
    const matchesSearch = item.crop.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === t.all || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  if (sortMode === "asc") filteredListings = [...filteredListings].sort((a, b) => a.price - b.price);
  if (sortMode === "desc") filteredListings = [...filteredListings].sort((a, b) => b.price - a.price);

  // Cart sub-view
  if (subView === "cart") {
    return (
      <div className="absolute inset-0 z-10 bg-[#EAF3E7] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setSubView("list")} className="text-[#2F6B3D] hover:bg-white/60 bg-white/30 backdrop-blur-md rounded-2xl h-12 w-12 shadow-sm cursor-pointer">
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="text-3xl font-black text-[#2F6B3D] tracking-tighter">{t.cart}</h1>
        </div>

        {cart.length > 0 ? (
          <>
            <div className="space-y-3 mb-6">
              {cart.map(c => (
                <Card key={c.listing.id} className="border-none shadow-md rounded-[1.5rem] bg-white/80 overflow-hidden">
                  <CardContent className="p-4 flex gap-4 items-center">
                    <div className="h-14 w-14 rounded-2xl bg-[#F5F9F4] flex items-center justify-center text-2xl shadow-inner shrink-0">
                      {getCropEmoji(c.listing.crop)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-[#2F6B3D] text-base leading-none truncate">{c.listing.crop}</h3>
                      <p className="text-xs text-muted-foreground font-bold mt-1">{c.listing.priceLabel}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateCartQty(c.listing.id, -1)} className="size-8 rounded-xl bg-[#F5F9F4] flex items-center justify-center hover:bg-[#E8F0E5] active:scale-90 transition-all"><Minus className="size-3.5" /></button>
                      <span className="font-black text-[#2F6B3D] w-6 text-center">{c.quantity}</span>
                      <button onClick={() => updateCartQty(c.listing.id, 1)} className="size-8 rounded-xl bg-[#F5F9F4] flex items-center justify-center hover:bg-[#E8F0E5] active:scale-90 transition-all"><Plus className="size-3.5" /></button>
                    </div>
                    <button onClick={() => removeFromCart(c.listing.id)} className="text-red-400 hover:text-red-600 active:scale-90 transition-all p-2">
                      <Trash2 className="size-4" />
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-none shadow-xl rounded-[2rem] bg-white/90 mb-6">
              <CardContent className="p-6 flex justify-between items-center">
                <span className="font-black text-[#2F6B3D] text-xl">{t.orderTotal}:</span>
                <span className="font-black text-[#C6A85E] text-2xl">{cartTotal.toLocaleString()} {t.pricePer}</span>
              </CardContent>
            </Card>

            <Button 
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full h-16 rounded-[1.5rem] bg-[#2F6B3D] text-white font-black text-lg shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {checkoutLoading ? t.wait : t.checkout}
            </Button>
          </>
        ) : (
          <div className="text-center py-20 opacity-40 select-none">
            <ShoppingCart className="size-16 mx-auto mb-4 text-[#2F6B3D]" />
            <p className="font-black text-[#2F6B3D] text-lg">{t.emptyCart}</p>
            <p className="text-sm font-medium text-[#2F6B3D]/60 mt-2">{t.emptyCartHint}</p>
          </div>
        )}
      </div>
    );
  }

  // Main market list
  return (
    <div className="absolute inset-0 z-10 bg-[#EAF3E7] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-[#2F6B3D]">{t.agroMarket}</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setShowFilter(!showFilter)}
            className={`rounded-2xl h-12 w-12 border-none shadow-sm cursor-pointer hover:bg-white/90 ${showFilter ? 'bg-[#2F6B3D] text-white' : 'bg-white text-[#2F6B3D]'}`}
          >
            <Filter className="size-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => setSubView("cart")}
            className="rounded-2xl h-12 w-12 border-none bg-white shadow-sm text-[#2F6B3D] cursor-pointer hover:bg-white/90 relative"
          >
            <ShoppingCart className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">{cartCount}</span>
            )}
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilter && (
        <div className="mb-4 p-4 bg-white/80 backdrop-blur-md rounded-2xl shadow-md animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black text-[#2F6B3D]/50 uppercase">{t.sortByPrice}</span>
            <button onClick={() => setShowFilter(false)} className="text-[#2F6B3D]/40 hover:text-[#2F6B3D]"><X className="size-4" /></button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSortMode(sortMode === "asc" ? "none" : "asc")}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all ${sortMode === 'asc' ? 'bg-[#2F6B3D] text-white' : 'bg-[#F5F9F4] text-[#2F6B3D]'}`}
            >{t.sortAsc}</button>
            <button 
              onClick={() => setSortMode(sortMode === "desc" ? "none" : "desc")}
              className={`flex-1 h-10 rounded-xl text-xs font-bold transition-all ${sortMode === 'desc' ? 'bg-[#2F6B3D] text-white' : 'bg-[#F5F9F4] text-[#2F6B3D]'}`}
            >{t.sortDesc}</button>
          </div>
        </div>
      )}

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-5" />
        <input 
          type="text" 
          placeholder={t.searchPlaceholder} 
          className="w-full h-15 bg-white rounded-2xl pl-12 pr-4 shadow-xl shadow-green-900/5 border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/20 transition-all text-sm font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        {[t.all, t.vegetables, t.fruits, t.grains, t.otherCrops].map(cat => (
          <button 
            key={cat} 
            onClick={() => setActiveCategory(cat)}
            className={`px-5 h-11 rounded-2xl shadow-sm border-none text-sm font-bold whitespace-nowrap active:scale-95 transition-all cursor-pointer ${activeCategory === cat ? 'bg-[#2F6B3D] text-white' : 'bg-white text-[#2F6B3D]'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredListings.length > 0 ? filteredListings.map(item => (
          <Card key={item.id} className="border-none shadow-md shadow-green-900/5 rounded-[1.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <CardContent className="p-4 flex gap-4">
              <div className="h-20 w-20 rounded-2xl bg-[#F5F9F4] flex items-center justify-center text-3xl shadow-inner shrink-0 leading-none pb-1">
                {getCropEmoji(item.crop)}
              </div>
              <div className="flex flex-col justify-center flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-[#2F6B3D] text-lg leading-none">{item.crop}</h3>
                  <span className="font-black text-[#C6A85E] text-sm whitespace-nowrap">{item.priceLabel}</span>
                </div>
                <p className="text-muted-foreground text-xs font-bold mt-1 mb-2">{t.volume}: {item.volume}</p>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-muted-foreground/80">
                    <UserIcon className="size-3.5" />
                    <span className="text-[10px] uppercase font-heavy tracking-tighter truncate">{item.farmer} • {item.region}</span>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                    className="px-3 py-1.5 bg-[#2F6B3D] text-white text-[10px] font-black uppercase rounded-xl hover:bg-[#2F6B3D]/80 active:scale-90 transition-all shadow-sm"
                  >
                    {t.addToCart}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center py-20 opacity-30 select-none">
            <ShoppingBasket className="size-16 mx-auto mb-4" />
            <p className="font-bold">{t.nothingFound}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
