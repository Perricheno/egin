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
import { cropLabels, PlatformLanguage, ui } from "@/lib/i18n";
import { area as turfArea } from "@turf/turf";

export default function Home() {
  const mapRef = useRef<MapRef>(null);
  const [isPoleOpen, setIsPoleOpen] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
  const [language, setLanguage] = useState<PlatformLanguage>("ru");
  const [fieldName, setFieldName] = useState("Орёл 22");
  const [selectedCrop, setSelectedCrop] = useState<string>(cropLabels.ru.watermelon);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "market" | "profile">("map");
  const [isDrawing, setIsDrawing] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const t = ui[language];
  const areaSizeHectares = drawnGeometry
    ? turfArea({
        type: "Feature",
        geometry: drawnGeometry,
        properties: {},
      }) / 10000
    : 0;

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
    setIsLoggedIn(true);
  };

  const handleMapDraw = (geometry: any) => {
    setDrawnGeometry(geometry);
    setIsDrawing(false);
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
      const res = await fetch("http://localhost:3000/farm-plots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          title: fieldName.trim(),
          region: "Алматинская",
          district: "Талгарский",
          areaSizeHectares: Number(areaSizeHectares.toFixed(2)),
          geometry: JSON.stringify(drawnGeometry),
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
        <Map
          ref={mapRef}
          onGeometrySelected={handleMapDraw}
          drawModeActive={isDrawing}
          language={language}
          showMeasurements={true}
        />
      </div>

      {activeTab === 'market' && <MarketView language={language} />}
      {activeTab === 'profile' && <ProfileView language={language} />}

      {/* Map Specific UI overlays */}
      <div className={activeTab === 'map' ? 'block' : 'hidden'}>
        <div className="absolute top-6 left-1/2 z-20 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-white/88 p-1 shadow-lg backdrop-blur-md">
            {(["ru", "kk", "en"] as PlatformLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                  language === lang
                    ? "bg-[#2F6B3D] text-white"
                    : "text-[#2F6B3D]/60 hover:bg-[#F5F9F4]"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Top-Left Floating Legend Card */}
        <div className="absolute top-6 left-6 z-10 w-44">
          <Card className="shadow-lg border-none bg-white/90 backdrop-blur-md rounded-[1.5rem] p-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#2F6B3D] opacity-40 mb-3">{t.legend}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-[#F5F9F4] flex items-center justify-center text-[10px] shadow-sm">🍉</div>
                <span className="text-sm font-bold text-[#2F6B3D]">{cropLabels[language].watermelon}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-[#F5F9F4] flex items-center justify-center text-[10px] shadow-sm">🥔</div>
                <span className="text-sm font-bold text-[#2F6B3D]">{cropLabels[language].potato}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-[#F5F9F4] flex items-center justify-center text-[10px] shadow-sm">🌾</div>
                <span className="text-sm font-bold text-[#2F6B3D]">{cropLabels[language].wheat}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Top-Right Location Button */}
        <div className="absolute top-6 right-6 z-10">
          <Button
            size="icon"
            onClick={() => mapRef.current?.focusCurrentLocation()}
            className="size-13 rounded-2xl bg-white/90 backdrop-blur-md text-[#2F6B3D] shadow-xl border-none hover:bg-white transition-all"
          >
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
            {t.myField}
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
          <select 
            className="h-14 w-full rounded-2xl border-none bg-[#F5F9F4] px-4 py-2 text-sm font-bold text-[#2F6B3D] shadow-inner"
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
          >
            <option value={cropLabels[language].watermelon}>🍉 {cropLabels[language].watermelon}</option>
            <option value={cropLabels[language].potato}>🥔 {cropLabels[language].potato}</option>
            <option value={cropLabels[language].wheat}>🌾 {cropLabels[language].wheat}</option>
          </select>
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
