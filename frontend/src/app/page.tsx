"use client";

import { useState, useRef, useEffect } from "react";
import Map, { MapRef } from "@/components/map/Map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActionModal from "@/components/ui/action-modal";
import MarketView from "@/components/ui/market-view";
import ProfileView from "@/components/ui/profile-view";
import AuthView from "@/components/ui/auth-view";
import { Map as MapIcon, ShoppingBasket, User, Navigation2, Plus } from "lucide-react";

export default function Home() {
  const mapRef = useRef<MapRef>(null);
  const [isPoleOpen, setIsPoleOpen] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
  const [selectedCrop, setSelectedCrop] = useState("Арбуз");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "market" | "profile">("map");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("agro_token");
    if (token) setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    setSelectedCrop(cropLabels[language].watermelon);
    setFieldName(language === "ru" ? "Орёл 22" : language === "kk" ? "Қыран 22" : "Eagle 22");
  }, [language]);

  const handleAuthSuccess = (authData: any) => {
    localStorage.setItem("agro_token", authData.access_token);
    if (authData.user?.fullName) {
      localStorage.setItem("agro_user_name", authData.user.fullName);
    }
    if (authData.user?.phone) {
      localStorage.setItem("agro_user_phone", authData.user.phone);
    }
    if (authData.user?.role) {
      localStorage.setItem("agro_user_role", authData.user.role);
    }
    if (authData.user?.region) {
      localStorage.setItem("agro_user_region", authData.user.region);
    }
    if (authData.user?.district) {
      localStorage.setItem("agro_user_district", authData.user.district);
    }
    setIsLoggedIn(true);
  };

  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setIsRulerActive(false);
    setDrawnGeometry(null);
  };

  const handleSaveNewPlot = () => {
    const geom = mapRef.current?.getSelectedGeometry();
    if (!geom) {
      alert("Сначала выделите нарисованный объект на карте (стрелкой)!");
      return;
    }
    setDrawnGeometry(geom);
    setIsPoleOpen(true);
  };

  const submitPlot = async () => {
    if (!drawnGeometry) {
      alert(t.drawFieldFirst);
      setIsPoleOpen(false);
      return;
    }

    if (!fieldName.trim()) {
      alert(`${t.fieldName}: ${t.fieldNamePlaceholder}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch("http://localhost:3008/farm-plots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: "Мое новое поле",
          region: "Алматинская",
          district: "Талгарский",
          areaSizeHectares: Number(areaSizeHectares.toFixed(2)),
          geometry: drawnGeometry,
          cropType: selectedCrop,
          seasonYear: 2024
        })
      });

      const json = await res.json();
      
      if (json.success) {
        alert(`${t.plotSaved}\n\n${t.analysisStatus}: ${json.data.analysis.riskLevel}\n${json.data.analysis.message}`);
        mapRef.current?.refreshPlots();
      } else {
        alert("Ошибка: " + json.message);
      }
    } catch (e) {
      alert(t.saveError);
    } finally {
      setIsSubmitting(false);
      setIsPoleOpen(false);
    }
  };

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#EAF3E7] font-sans">
      {!isLoggedIn && <AuthView onSuccess={handleAuthSuccess} language={language} />}
      
      {/* 1. Full-screen Map Background */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-300 ${activeTab === 'map' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <Map ref={mapRef} onGeometrySelected={handleMapDraw} drawModeActive={isDrawing} />
      </div>

      {activeTab === 'market' && <MarketView />}
      {activeTab === 'profile' && <ProfileView />}

      {/* Map Specific UI overlays */}
      <div className={activeTab === 'map' ? 'block' : 'hidden'}>
        {/* 2. Top-Left Floating Legend Card */}
        <div className="absolute top-6 left-6 z-10 w-44">
          <Card className="shadow-lg border-none bg-white/90 backdrop-blur-md rounded-[1.5rem] p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2F6B3D] opacity-40 mb-3">Легенда</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-[#F5F9F4] flex items-center justify-center text-[10px] shadow-sm">🍉</div>
                <span className="text-sm font-bold text-[#2F6B3D]">Арбуз</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-[#F5F9F4] flex items-center justify-center text-[10px] shadow-sm">🥔</div>
                <span className="text-sm font-bold text-[#2F6B3D]">Картофель</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-[#F5F9F4] flex items-center justify-center text-[10px] shadow-sm">🌾</div>
                <span className="text-sm font-bold text-[#2F6B3D]">Пшеница</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Top-Right Location Button */}
        <div className="absolute top-6 right-6 z-10">
          <Button size="icon" className="size-13 rounded-2xl bg-white/90 backdrop-blur-md text-[#2F6B3D] shadow-xl border-none hover:bg-white transition-all">
            <Navigation2 className="size-6 fill-[#2F6B3D]" />
          </Button>
        </div>

        {/* 4. Bottom-Right Floating CTA */}
        <div className="absolute bottom-24 right-6 z-10">
          <Button 
            className="h-16 px-7 rounded-[1.5rem] bg-[#2F6B3D] text-white shadow-2xl shadow-green-900/40 hover:scale-105 transition-transform flex items-center gap-3 font-black text-lg"
            onClick={() => setIsDrawing(true)}
          >
            <Plus className="size-6 stroke-[3px]" />
            Моё поле
          </Button>
        </div>
      </div>

      <ActionModal 
        isOpen={isPoleOpen}
        onClose={() => setIsPoleOpen(false)}
        title={t.newField}
        primaryActionText={isSubmitting ? t.saving : t.save}
        onPrimaryAction={submitPlot}
        language={language}
      >
        <p className="mb-4 text-[#2F6B3D] font-bold opacity-70">
          {t.chooseCrop}
        </p>

        <div className="mb-4">
          <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-[#2F6B3D]/50">
            {t.fieldName}
          </label>
          <input
            type="text"
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            placeholder={t.fieldNamePlaceholder}
            className="h-14 w-full rounded-2xl border-none bg-[#F5F9F4] px-4 text-sm font-bold text-[#2F6B3D] shadow-inner outline-none"
          />
        </div>

        <div className="mb-4 rounded-2xl bg-[#F5F9F4] px-4 py-3 text-sm font-bold text-[#2F6B3D] shadow-inner">
          {t.area}: {areaSizeHectares.toFixed(2)} {t.hectares}
        </div>
        
        <div className="flex flex-col gap-2 mb-2">
          <input 
            type="text"
            className="h-14 w-full rounded-2xl border-none bg-[#F5F9F4] px-4 py-2 text-sm font-bold text-[#2F6B3D] shadow-inner mb-2 focus:outline-none"
            placeholder="Название участка"
            value={plotTitle}
            onChange={(e) => setPlotTitle(e.target.value)}
          />
          <select 
            className="h-14 w-full rounded-2xl border-none bg-[#F5F9F4] px-4 py-2 text-sm font-bold text-[#2F6B3D] shadow-inner"
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
          >
            <option value="Арбуз">🍉 Арбуз</option>
            <option value="Картофель">🥔 Картофель</option>
            <option value="Пшеница">🌾 Пшеница</option>
          </select>
        </div>
      </ActionModal>

      {/* Edit Existing Plot Modal */}
      <ActionModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Редактирование участка"
        primaryActionText={isSubmitting ? "Сохранение..." : "Сохранить"}
        onPrimaryAction={updatePlot}
      >
        <p className="mb-4 text-[#2F6B3D] font-bold opacity-70">
          Измените данные выделенного участка:
        </p>
        
        <div className="flex flex-col gap-2 mb-2">
          <input 
            type="text"
            className="h-14 w-full rounded-2xl border-none bg-[#F5F9F4] px-4 py-2 text-sm font-bold text-[#2F6B3D] shadow-inner mb-2 focus:outline-none"
            placeholder="Название участка"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <select 
            className="h-14 w-full rounded-2xl border-none bg-[#F5F9F4] px-4 py-2 text-sm font-bold text-[#2F6B3D] shadow-inner mb-4"
            value={editCrop}
            onChange={(e) => setEditCrop(e.target.value)}
          >
            <option value="Арбуз">🍉 Арбуз</option>
            <option value="Картофель">🥔 Картофель</option>
            <option value="Пшеница">🌾 Пшеница</option>
            <option value="Кукуруза">🌽 Кукуруза</option>
            <option value="Хлопок">☁️ Хлопок</option>
            <option value="Яблоня">🍎 Яблоня</option>
          </select>
          <button 
             onClick={deletePlot}
             disabled={isSubmitting}
             className="w-full flex items-center justify-center h-14 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-100 transition-colors"
          >
             Удалить участок
          </button>
        </div>
      </ActionModal>

      {/* 5. Bottom Navigation Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-40 pb-6 px-6 pointer-events-auto">
        <div className="mx-auto max-w-md bg-white/80 backdrop-blur-2xl border border-white/40 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] h-22 flex items-center justify-around px-2">
          <button 
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center gap-1 group transition-all ${activeTab === 'map' ? 'text-[#2F6B3D]' : 'text-muted-foreground hover:text-[#2F6B3D]'}`}
          >
            <div className={`p-3 rounded-2xl group-active:scale-95 transition-all ${activeTab === 'map' ? 'bg-[#2F6B3D] text-white shadow-lg shadow-green-900/20' : ''}`}>
              <MapIcon className="size-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.map}</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("market")}
            className={`flex flex-col items-center gap-1 group transition-all ${activeTab === 'market' ? 'text-[#2F6B3D]' : 'text-muted-foreground hover:text-[#2F6B3D]'}`}
          >
            <div className={`p-3 rounded-2xl group-active:scale-95 transition-all ${activeTab === 'market' ? 'bg-[#2F6B3D] text-white shadow-lg shadow-green-900/20' : ''}`}>
              <ShoppingBasket className="size-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.market}</span>
          </button>

          <button 
            onClick={() => setActiveTab("admin")}
            className={`flex flex-col items-center gap-1 group transition-all ${activeTab === 'admin' ? 'text-[#2F6B3D]' : 'text-muted-foreground hover:text-[#2F6B3D]'}`}
          >
            <div className={`p-3 rounded-2xl group-active:scale-95 transition-all ${activeTab === 'admin' ? 'bg-[#2F6B3D] text-white shadow-lg shadow-green-900/20' : ''}`}>
              <Shield className="size-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Админка</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center gap-1 group transition-all ${activeTab === 'profile' ? 'text-[#2F6B3D]' : 'text-muted-foreground hover:text-[#2F6B3D]'}`}
          >
            <div className={`p-3 rounded-2xl group-active:scale-95 transition-all ${activeTab === 'profile' ? 'bg-[#2F6B3D] text-white shadow-lg shadow-green-900/20' : ''}`}>
              <User className="size-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">{t.profile}</span>
          </button>
        </div>
      </div>
    </main>
  );
}
