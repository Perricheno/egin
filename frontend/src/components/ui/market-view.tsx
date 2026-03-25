"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, ShoppingBasket, X, PhoneCall, Calendar, RefreshCw, ArrowDownAZ, ArrowUpZA, Clock } from "lucide-react";
import CreateListingModal from "./create-listing-modal";

export default function MarketView() {
  const [listings, setListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Все");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  
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

      // Add minimum delay for smooth skeleton animation if refreshing manually
      if (manualRefresh) {
        await new Promise(r => setTimeout(r, 600));
      }

      const res = await fetch(`http://localhost:3000/marketplace/listings?${queryParams.toString()}`);
      const json = await res.json();

      if (res.ok && json.length > 0) {
        setListings(json.map((item: any) => ({
          ...item,
          crop: item.cropId || item.title,
          volume: item.quantity ? `${item.quantity} ${item.unit}` : "Не указан",
          priceOutput: item.price ? `${item.price.toLocaleString("ru-RU")} ${item.currency}/${item.unit}` : "Договорная",
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
  }, [activeCategory, searchQuery, sortBy, sortOrder]);

  return (
    <div className="absolute inset-0 z-10 bg-gradient-to-br from-[#EAF3E7] to-[#F5F9F4] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-black text-[#2F6B3D] tracking-tight">Агро Маркет</h1>
          <p className="text-muted-foreground text-sm font-medium mt-1">Оптовые закупки и продажи</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => fetchMarketData(true)}
            variant="outline" size="icon" 
            className="rounded-2xl h-12 w-12 border-none bg-white shadow-xl shadow-green-900/5 text-[#2F6B3D] cursor-pointer hover:bg-white/90 hover:scale-105 active:scale-95 transition-all"
          >
            <RefreshCw className={`size-5 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-none bg-white shadow-xl shadow-green-900/5 text-[#2F6B3D] cursor-pointer hover:bg-white/90 hover:scale-105 transition-all">
            <Filter className="size-5" />
          </Button>
        </div>
      </div>

      <div className="relative mb-4 group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground size-5 transition-colors group-focus-within:text-[#2F6B3D]" />
        <input 
          type="text" 
          placeholder="Поиск культур или регионов..." 
          className="w-full h-16 bg-white/80 backdrop-blur-md rounded-3xl pl-12 pr-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-all text-sm font-bold"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x flex-1">
          {["Все", "Овощи", "Фрукты", "Зерновые", "Прочее"].map(cat => (
            <button 
              key={cat} 
              onClick={() => setActiveCategory(cat)}
              className={`snap-center px-5 h-10 rounded-full shadow-sm border border-transparent font-extrabold text-sm whitespace-nowrap active:scale-95 transition-all cursor-pointer ${activeCategory === cat ? 'bg-[#2F6B3D] text-[#EAF3E7] shadow-lg shadow-green-900/20' : 'bg-white/70 text-[#2F6B3D] hover:bg-white backdrop-blur-md border-white/40'}`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <button 
          onClick={toggleSort}
          className="ml-3 px-4 h-10 rounded-full bg-white/70 backdrop-blur-md shadow-sm border border-white/40 font-bold text-xs text-[#2F6B3D] flex items-center gap-1.5 active:scale-95 transition-all whitespace-nowrap"
        >
          {sortBy === "createdAt" ? (
            <><Clock className="size-3.5" /> Сначала новые</>
          ) : sortOrder === "ASC" ? (
            <><ArrowDownAZ className="size-3.5" /> Дешевле</>
          ) : (
            <><ArrowUpZA className="size-3.5" /> Дороже</>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {isLoading || isRefreshing ? (
          // Skeleton Loaders
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 w-full bg-white/40 backdrop-blur-sm rounded-[2rem] p-4 flex gap-4 animate-pulse duration-1000 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <div className="h-24 w-24 rounded-3xl bg-slate-200/50 shrink-0" />
              <div className="flex flex-col justify-center flex-1 py-2 gap-3">
                <div className="h-5 w-3/4 bg-slate-200/50 rounded-lg" />
                <div className="h-4 w-1/2 bg-slate-200/50 rounded-lg" />
                <div className="mt-auto h-4 w-1/3 bg-slate-200/50 rounded-lg" />
              </div>
            </div>
          ))
        ) : listings.length > 0 ? (
          listings.map((item, index) => (
            <Card 
              key={item.id} 
              onClick={() => setSelectedListing(item)}
              className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[2rem] overflow-hidden bg-white/70 backdrop-blur-lg cursor-pointer hover:scale-[1.02] hover:bg-white hover:shadow-[0_20px_40px_rgba(47,107,61,0.08)] transition-all duration-300 group fill-mode-both animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <CardContent className="p-4 flex gap-4 relative">
                <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-white to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#F5F9F4] to-[#EAF3E7] flex items-center justify-center text-4xl shadow-inner shrink-0 leading-none pb-1 relative overflow-hidden group-hover:shadow-md transition-shadow">
                  <span className="absolute inset-0 bg-white/20"></span>
                  {item.category === "Фрукты" ? "🍉" : item.category === "Овощи" ? "🥔" : item.category === "Зерновые" ? "🌾" : "📦"}
                </div>

                <div className="flex flex-col justify-center flex-1 py-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-black text-[#2F6B3D] text-lg leading-tight line-clamp-2">{item.title}</h3>
                  </div>
                  <div className="mt-1 mb-2 font-black text-[#C6A85E] text-md whitespace-nowrap">{item.priceOutput}</div>
                  
                  <div className="flex items-center gap-2 text-muted-foreground/80 mt-auto">
                    <div className="bg-[#2F6B3D]/5 px-2 py-1 rounded-lg text-[10px] font-bold text-[#2F6B3D]">{item.volume}</div>
                    <UserIcon className="size-3.5" />
                    <span className="text-[10px] uppercase font-bold tracking-tighter truncate max-w-[100px]">{item.farmerName}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 opacity-40 select-none animate-in fade-in zoom-in duration-500">
            <div className="bg-white/50 p-6 rounded-full mb-4 shadow-inner">
              <ShoppingBasket className="size-16 text-[#2F6B3D]" />
            </div>
            <p className="font-extrabold text-[#2F6B3D] text-lg">Ничего не найдено</p>
            <p className="text-xs font-medium text-muted-foreground mt-1">Попробуйте изменить параметры поиска</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-gradient-to-b from-white to-[#F9FCF8] w-full sm:w-[32rem] max-h-[90vh] sm:rounded-3xl rounded-t-[2.5rem] shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-bottom-20 duration-500">
            
            <div className="relative h-48 bg-gradient-to-br from-[#2F6B3D]/10 to-[#2F6B3D]/5 flex items-center justify-center rounded-t-[2.5rem]">
              <button 
                onClick={() => setSelectedListing(null)} 
                className="absolute top-4 right-4 p-2 rounded-full bg-white/50 hover:bg-white backdrop-blur-md text-slate-700 shadow-sm transition-all"
              >
                <X className="size-5" />
              </button>
              <span className="text-8xl drop-shadow-xl saturate-150">
                {selectedListing.category === "Фрукты" ? "🍉" : selectedListing.category === "Овощи" ? "🥔" : selectedListing.category === "Зерновые" ? "🌾" : "📦"}
              </span>
            </div>

            <div className="p-8 pb-10">
              <div className="flex justify-between items-start mb-6 gap-4">
                <div>
                  <div className="inline-block bg-[#2F6B3D]/10 text-[#2F6B3D] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3">
                    {selectedListing.category}
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{selectedListing.title}</h2>
                </div>
              </div>

              <p className="text-slate-600 text-sm font-medium leading-relaxed mb-8 bg-white/50 p-4 rounded-2xl shadow-inner">
                {selectedListing.description || "Описание отсутствует. Пожалуйста, свяжитесь с продавцом для подробностей."}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-center items-center text-center">
                  <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mb-1">Сумма / Цена</span>
                  <span className="text-[#C6A85E] font-black text-lg">{selectedListing.priceOutput}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-center items-center text-center">
                  <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mb-1">Объем в наличии</span>
                  <span className="text-slate-800 font-extrabold text-lg">{selectedListing.volume}</span>
                </div>
                <div className="bg-white p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-slate-100 flex flex-col justify-center items-center text-center col-span-2">
                  <Calendar className="size-4 text-[#2F6B3D] mb-2" />
                  <span className="text-muted-foreground text-[10px] font-black uppercase tracking-wider mb-1">Свободно с даты</span>
                  <span className="text-slate-800 font-extrabold text-sm">{new Date(selectedListing.availableFrom).toLocaleDateString("ru-RU")}</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-[2rem] border border-slate-100/50 mb-4">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-gradient-to-tr from-[#2F6B3D] to-[#459B58] text-white flex items-center justify-center font-black shadow-lg shadow-green-900/20">
                    {selectedListing.farmerName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-900">{selectedListing.farmerName}</div>
                    <div className="text-[11px] font-bold text-slate-500">{selectedListing.location}</div>
                  </div>
                </div>
                <Button className="rounded-full size-12 bg-[#2F6B3D] hover:bg-[#204a2a] text-white shadow-xl shadow-green-900/20 transition-all flex items-center justify-center p-0">
                  <PhoneCall className="size-5" />
                </Button>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {/* Floating Add Listing Button */}
      <div className="fixed bottom-28 right-6 z-30">
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="size-16 rounded-[1.8rem] bg-[#C6A85E] text-white shadow-[0_10px_40px_rgba(198,168,94,0.5)] hover:bg-[#b09451] hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer border-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
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

function UserIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
