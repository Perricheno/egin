"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, X, PhoneCall, Calendar, RefreshCw, ArrowDownAZ, ArrowUpZA, Clock, ShoppingCart, Star, ShieldCheck, Droplet, CheckCircle2, LayoutGrid, List } from "lucide-react";
import CreateListingModal from "./create-listing-modal";

const getCardVisuals = (title: string, category: string, id: string) => {
  const images: Record<string, string> = {
    "Арбуз": "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?q=80&w=400&auto=format&fit=crop",
    "Картофель": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=400&auto=format&fit=crop",
    "Пшеница": "https://images.unsplash.com/photo-1574323347407-2fac25d970e7?q=80&w=400&auto=format&fit=crop",
    "Морковь": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?q=80&w=400&auto=format&fit=crop",
    "Овощи": "https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?q=80&w=400&auto=format&fit=crop",
    "Фрукты": "https://plus.unsplash.com/premium_photo-1675237625695-1f92e92c2dd9?q=80&w=400&auto=format&fit=crop",
    "Зерновые": "https://images.unsplash.com/photo-1501430654243-c934cec2e1c0?q=80&w=400&auto=format&fit=crop"
  };

  let imgUrl = Object.entries(images).find(([key]) => title.toLowerCase().includes(key.toLowerCase()))?.[1]
            || images[category] 
            || "https://images.unsplash.com/photo-1592424005167-9bb29c0b0add?q=80&w=400&auto=format&fit=crop";

  const charCode = id ? id.charCodeAt(0) + id.charCodeAt(id.length - 1) : 100;
  const rating = ((charCode % 30) / 10 + 4.0).toFixed(1);

  const tags = [];
  if (charCode % 2 === 0) tags.push("ORGANIC");
  if (charCode % 3 === 0) tags.push("FRESH");
  if (charCode % 5 === 0) tags.push("GLOBALGAP");
  if (tags.length === 0) tags.push("BEST VALUE");

  const subtitleTypes = [
    { icon: <Clock className="size-3" />, text: "Свежий урожай" },
    { icon: <CheckCircle2 className="size-3" />, text: "Проверенный оборот" },
    { icon: <Droplet className="size-3" />, text: "12% Влажность" }
  ];
  const subtitle = subtitleTypes[charCode % 3];

  return { imgUrl, rating, tags, subtitle };
};

export default function MarketView() {
  const [listings, setListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<"createdAt" | "price">("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");

  const toggleSort = () => {
    if (sortBy === "createdAt") {
      setSortBy("price");
      setSortOrder("ASC");
    } else if (sortBy === "price" && sortOrder === "ASC") {
      setSortOrder("DESC");
    } else {
      setSortBy("createdAt");
      setSortOrder("DESC");
    }
  };

  const fetchMarketData = async (manualRefresh = false) => {
    if (manualRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const queryParams = new URLSearchParams();
      if (activeCategory !== "Все") queryParams.append("category", activeCategory);
      if (searchQuery) queryParams.append("search", searchQuery);
      queryParams.append("sortBy", sortBy);
      queryParams.append("sortOrder", sortOrder);

      if (manualRefresh) {
        await new Promise(r => setTimeout(r, 600));
      }

      const res = await fetch(`http://localhost:3000/marketplace/listings?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.length > 0) {
        setListings(json.map((item: any) => ({
          ...item,
          crop: item.cropId || item.title,
          volume: item.quantity ? `${item.quantity}${item.unit}` : "н/д",
          priceValue: item.price ? item.price.toLocaleString("ru-RU") : "Договорная",
          priceUnit: item.price ? `/${item.unit}` : "",
          farmerName: item.farmer?.fullName || "Неизвестный фермер"
        })));
      } else {
        setListings([]);
      }
    } catch (err) {
      console.error("Failed to fetch listings", err);
      setListings([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, searchQuery, sortBy, sortOrder]);

  return (
    <div className="absolute inset-0 z-10 bg-[#F8F6F0] pt-8 px-5 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
      
      {/* Header Area matching reference */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1 pr-2">
          <h1 className="text-3xl font-black text-[#1A2E1F] tracking-tight leading-none mb-2">Prime Harvest Arrivals</h1>
          <p className="text-[#6B7264] text-xs font-semibold leading-snug">Curated premium crops from verified regional clusters.</p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <div className="flex gap-2">
            <Button 
              onClick={() => fetchMarketData(true)}
              variant="outline" size="icon" 
              className="rounded-xl h-9 w-9 border-none bg-[#EAE8E0] shadow-sm text-[#1A2E1F] hover:bg-[#DCD8CD] active:scale-95 transition-all"
            >
              <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
            <div className="flex bg-[#EAE8E0] rounded-xl p-1 shadow-inner h-9 items-center">
              <button 
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 rounded-lg flex items-center justify-center transition-all text-[11px] font-black ${viewMode === "grid" ? "bg-white text-[#1A2E1F] shadow-sm" : "text-[#757E70]"}`}
              >
                Grid
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`px-3 py-1 rounded-lg flex items-center justify-center transition-all text-[11px] font-black ${viewMode === "list" ? "bg-white text-[#1A2E1F] shadow-sm" : "text-[#757E70]"}`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mb-5 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground size-4.5 transition-colors group-focus-within:text-[#1A2E1F]" />
        <input 
          type="text" 
          placeholder="Поиск культур или регионов..." 
          className="w-full h-12 bg-white rounded-[1rem] pl-11 pr-4 shadow-[0_2px_15px_rgb(0,0,0,0.03)] border-none focus:outline-none focus:ring-2 focus:ring-[#1A2E1F]/20 transition-all text-sm font-bold text-[#1A2E1F]"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x flex-1">
          {["Все", "Овощи", "Фрукты", "Зерновые", "Прочее"].map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`snap-center px-4 h-9 rounded-full shadow-sm border border-transparent font-bold text-xs whitespace-nowrap active:scale-95 transition-all cursor-pointer ${activeCategory === cat ? 'bg-[#1A2E1F] text-white shadow-md' : 'bg-white text-[#1A2E1F] border-[#EAE8E0]'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <button 
          onClick={toggleSort}
          className="ml-2 px-3 h-9 rounded-full bg-white shadow-sm border border-[#EAE8E0] font-bold text-[10px] uppercase tracking-wider text-[#1A2E1F] flex items-center gap-1 active:scale-95 transition-all whitespace-nowrap"
        >
          {sortBy === "createdAt" ? (
            <><Clock className="size-3" /> НОВЫЕ</>
          ) : sortOrder === "ASC" ? (
            <><ArrowDownAZ className="size-3" /> ДЕШЕВЛЕ</>
          ) : (
            <><ArrowUpZA className="size-3" /> ДОРОЖЕ</>
          )}
        </button>
      </div>

      <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-4 gap-4" : "flex flex-col gap-4"}>
        {isLoading || isRefreshing ? (
          // Skeleton Loaders
          [1, 2, 3, 4].map((i) => (
            <div key={i} className={`bg-white rounded-[1.5rem] p-3 flex animate-pulse shadow-[0_4px_20px_rgb(0,0,0,0.02)] ${viewMode === "grid" ? "flex-col gap-3 h-[280px]" : "gap-4 h-32"}`}>
              <div className={`bg-[#EAE8E0]/70 rounded-2xl shrink-0 ${viewMode === "grid" ? "h-36 w-full" : "h-24 w-24"}`} />
              <div className="flex flex-col justify-center flex-1 gap-2">
                <div className="h-4 w-3/4 bg-[#EAE8E0]/70 rounded-md" />
                <div className="h-3 w-1/2 bg-[#EAE8E0]/70 rounded-md" />
                <div className="mt-auto h-5 w-1/2 bg-[#EAE8E0]/70 rounded-md" />
              </div>
            </div>
          ))
        ) : listings.length > 0 ? (
          listings.map((item, index) => {
            const visuals = getCardVisuals(item.title, item.category, item.id);
            
            return (
              <Card 
                key={item.id} 
                onClick={() => setSelectedListing(item)}
                className={`border-none shadow-[0_4px_20px_rgb(0,0,0,0.03)] rounded-[1.5rem] overflow-hidden bg-white cursor-pointer hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(26,46,31,0.08)] transition-all duration-300 group fill-mode-both animate-in fade-in slide-in-from-bottom-6 ${viewMode === "grid" ? "flex flex-col" : "flex flex-row"}`}
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {/* Reference style image container */}
                <div className={`relative bg-[#1A2E1F] shrink-0 overflow-hidden ${viewMode === "grid" ? "h-44 w-full" : "h-32 w-32 p-2 bg-transparent"}`}>
                  <div className={`w-full h-full relative ${viewMode === "list" ? "rounded-xl overflow-hidden" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={visuals.imgUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-in-out" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent opacity-80" />
                    
                    {/* Badges Overlay */}
                    <div className="absolute top-3 left-3 flex gap-2 flex-wrap pr-3">
                      {visuals.tags.map(tag => (
                        <span key={tag} className="bg-white text-[#4A5D23] text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full shadow-sm drop-shadow-sm">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Body matching reference */}
                <CardContent className={`p-4 flex flex-col flex-1 ${viewMode === "grid" ? "" : "justify-center"}`}>
                  
                  {/* Title and Rating Row */}
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <h3 className="font-bold text-[#1F3323] text-base leading-tight line-clamp-2">{item.title}</h3>
                    <div className="flex items-center gap-1 text-[#5E3A18] font-black text-[11px] shrink-0 mt-0.5">
                      <Star className="size-3 fill-[#86591C] text-[#86591C]" />
                      <span>{visuals.rating}</span>
                    </div>
                  </div>
                  
                  {/* Verified / Subtitle Row */}
                  <div className="flex items-center gap-1.5 text-[#868A80] mb-auto mt-1">
                    {visuals.subtitle.icon}
                    <span className="text-[10px] font-bold">{visuals.subtitle.text}</span>
                  </div>
                  
                  {/* Footer Row: Price + Button */}
                  <div className={`flex items-end justify-between ${viewMode === "grid" ? "mt-5" : "mt-2"}`}>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-[#868A80] uppercase tracking-wider mb-0.5">
                        MIN ORDER: {item.volume}
                      </span>
                      <div className="flex items-baseline text-[#1F3323]">
                        <span className="font-black text-2xl leading-none">{item.priceValue}</span>
                        <span className="text-xs font-bold text-[#868A80] ml-0.5">{item.priceUnit}</span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedListing(item); }}
                      className="bg-[#1A3626] hover:bg-[#12261a] text-white rounded-[0.8rem] h-11 w-11 flex items-center justify-center shadow-lg shadow-[#1A3626]/20 transition-all active:scale-90"
                    >
                      <ShoppingCart className="size-5" />
                    </button>
                  </div>

                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="col-span-2 lg:col-span-4 flex flex-col items-center justify-center py-20 opacity-40 select-none animate-in fade-in zoom-in duration-500">
            <div className="bg-[#EAE8E0] p-6 rounded-full mb-4 shadow-inner">
              <ShieldCheck className="size-16 text-[#1A2E1F]" />
            </div>
            <p className="font-extrabold text-[#1A2E1F] text-lg">Ничего не найдено</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">Попробуйте изменить параметры поиска</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#F8F6F0] w-full sm:w-[32rem] max-h-[95vh] sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-bottom-20 duration-500">
            
            <div className="relative h-64 bg-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getCardVisuals(selectedListing.title, selectedListing.category, selectedListing.id).imgUrl} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button 
                onClick={() => setSelectedListing(null)} 
                className="absolute top-5 right-5 p-2 rounded-full bg-white/30 hover:bg-white backdrop-blur-md text-black shadow-sm transition-all"
              >
                <X className="size-5" />
              </button>
              
              <div className="absolute bottom-5 left-6 right-6">
                <div className="inline-block bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                  {selectedListing.category}
                </div>
                <h2 className="text-3xl font-black text-white leading-tight drop-shadow-md">{selectedListing.title}</h2>
              </div>
            </div>

            <div className="p-6 pb-10">
              <p className="text-[#6B7264] text-sm font-medium leading-relaxed mb-6 bg-white p-5 rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                {selectedListing.description || "Описание товара отсутствует. Этот фермер еще не загрузил детальное описание партии."}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white p-4 rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-center items-center text-center">
                  <span className="text-[#A0A499] text-[10px] font-black uppercase tracking-wider mb-1">Сумма / Цена</span>
                  <div className="text-[#1A2E1F]">
                    <span className="font-black text-xl">{selectedListing.price ? selectedListing.price.toLocaleString("ru-RU") : "Догов."}</span>
                    <span className="text-xs font-bold text-[#757E70] ml-0.5">{selectedListing.price ? `/${selectedListing.unit}` : ""}</span>
                  </div>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-center items-center text-center">
                  <span className="text-[#A0A499] text-[10px] font-black uppercase tracking-wider mb-1">Мин. заказ</span>
                  <span className="text-[#1A2E1F] font-black text-xl">{selectedListing.quantity || "—"} <span className="text-xs text-[#757E70] font-bold">{selectedListing.unit}</span></span>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col justify-center items-center text-center col-span-2">
                  <Calendar className="size-4 text-[#1A2E1F] mb-1.5" />
                  <span className="text-[#A0A499] text-[10px] font-black uppercase tracking-wider mb-0.5">Доступно с даты</span>
                  <span className="text-[#1A2E1F] font-bold text-sm tracking-wide">{new Date(selectedListing.availableFrom).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white rounded-[1.5rem] shadow-[0_2px_10px_rgb(0,0,0,0.02)] mb-4 border border-[#EAE8E0]/50">
                <div className="flex items-center gap-3">
                  <div className="size-11 rounded-full bg-[#1A2E1F] text-white flex items-center justify-center font-black shadow-md relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#1A2E1F] to-[#2F6B3D] opacity-80" />
                    <span className="relative z-10">{selectedListing.farmerName.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="text-sm font-black text-[#1A2E1F]">{selectedListing.farmerName}</div>
                    <div className="text-[11px] font-bold text-[#757E70] flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="size-3 text-green-600" /> Verified Seller
                    </div>
                  </div>
                </div>
                <Button className="rounded-xl size-11 bg-[#EAE8E0] hover:bg-[#DCD8CD] text-[#1A2E1F] shadow-sm transition-all flex items-center justify-center p-0">
                  <PhoneCall className="size-5" />
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* Floating Add Listing Button */}
      <div className="fixed bottom-24 right-5 z-40">
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="h-14 w-14 rounded-full bg-[#86591C] text-white shadow-[0_10px_30px_rgba(134,89,28,0.4)] hover:bg-[#6e4815] hover:scale-105 active:scale-95 transition-all flex items-center justify-center p-0 border-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </Button>
      </div>

      <CreateListingModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={() => fetchMarketData(true)} 
      />
    </div>
  );
}
