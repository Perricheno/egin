"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Filter, ShoppingBasket } from "lucide-react";
import { PlatformLanguage, ui } from "@/lib/i18n";

export default function MarketView({ language }: { language: PlatformLanguage }) {
  const t = ui[language];
  const [listings, setListings] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>(t.all);

  const fetchMarketData = async () => {
    try {
      const res = await fetch("http://localhost:3000/marketplace/listings");
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setListings(json.data.map((item: any) => ({
          ...item,
          // Map backend fields to UI fields if needed
          crop: item.cropName || item.crop || t.culture,
          volume: item.quantity || item.volume || t.notSpecified,
          price: item.price ? `${item.price} ₸/т` : t.negotiable
        })));
      } else {
        setListings([
          { id: 1, crop: "Арбуз", volume: "10 тонн", price: "50 000 ₸/т", farmer: "Эдиль Т.", region: "Алматинская обл.", category: "Фрукты" },
          { id: 2, crop: "Картофель", volume: "5 тонн", price: "80 000 ₸/т", farmer: "Алибек С.", region: "Павлодарская обл.", category: "Овощи" },
          { id: 3, crop: "Пшеница", volume: "100 тонн", price: "120 000 ₸/т", farmer: "AgroFirm KZ", region: "Акмолинская обл.", category: "Зерновые" },
        ]);
      }
    } catch (err) {
      setListings([
        { id: 1, crop: "Арбуз", volume: "10 тонн", price: "50 000 ₸/т", farmer: "Эдиль Т.", region: "Алматинская обл.", category: "Фрукты" },
        { id: 2, crop: "Картофель", volume: "5 тонн", price: "80 000 ₸/т", farmer: "Алибек С.", region: "Павлодарская обл.", category: "Овощи" },
        { id: 3, crop: "Пшеница", volume: "100 тонн", price: "120 000 ₸/т", farmer: "AgroFirm KZ", region: "Акмолинская обл.", category: "Зерновые" },
      ]);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  useEffect(() => {
    setActiveCategory(t.all);
  }, [t.all]);

  const filteredListings = listings.filter(item => {
    const matchesSearch = item.crop.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.region.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === t.all || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="absolute inset-0 z-10 bg-[#EAF3E7] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black text-[#2F6B3D]">{t.agroMarket}</h1>
        <Button variant="outline" size="icon" className="rounded-2xl h-12 w-12 border-none bg-white shadow-sm text-[#2F6B3D] cursor-pointer hover:bg-white/90">
          <Filter className="size-5" />
        </Button>
      </div>

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
        {[t.all, t.vegetables, t.fruits, t.grains].map(cat => (
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
          <Card key={item.id} className="border-none shadow-md shadow-green-900/5 rounded-[1.5rem] overflow-hidden bg-white/80 backdrop-blur-md cursor-pointer hover:scale-[1.01] transition-transform">
            <CardContent className="p-4 flex gap-4">
              <div className="h-20 w-20 rounded-2xl bg-[#F5F9F4] flex items-center justify-center text-3xl shadow-inner shrink-0 leading-none pb-1">
                {item.crop === "Арбуз" ? "🍉" : item.crop === "Картофель" ? "🥔" : "🌾"}
              </div>
              <div className="flex flex-col justify-center flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-extrabold text-[#2F6B3D] text-lg leading-none">{item.crop}</h3>
                  <span className="font-black text-[#C6A85E] text-sm whitespace-nowrap">{item.price}</span>
                </div>
                <p className="text-muted-foreground text-xs font-bold mt-1 mb-2">{t.volume}: {item.volume}</p>
                <div className="flex items-center gap-1.5 text-muted-foreground/80 mt-auto">
                  <UserIcon className="size-3.5" />
                  <span className="text-[10px] uppercase font-heavy tracking-tighter truncate">{item.farmer} • {item.region}</span>
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
      
      {/* Floating Add Listing Button */}
      <div className="fixed bottom-28 right-6 z-30">
        <Button 
          onClick={() => alert(t.addListingSoon)}
          className="size-16 rounded-[1.5rem] bg-[#2F6B3D] text-white shadow-2xl shadow-green-900/40 hover:scale-110 transition-transform flex items-center justify-center cursor-pointer"
        >
          <ShoppingBasket className="size-7" />
        </Button>
      </div>
    </div>
  );
}

// Inline UserIcon to avoid external Lucide dependency inside this file for simplicity if needed
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
