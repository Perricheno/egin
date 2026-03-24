"use client";

import { useState, useRef, useEffect } from "react";
import Map, { MapRef } from "@/components/map/Map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActionModal from "@/components/ui/action-modal";
import MarketView from "@/components/ui/market-view";
import ProfileView from "@/components/ui/profile-view";
import AuthView from "@/components/ui/auth-view";
import { Map as MapIcon, ShoppingBasket, User, Navigation2, Plus, X, RotateCcw, Ruler, Settings } from "lucide-react";
import { cropLabels, cropList, PlatformLanguage, ui } from "@/lib/i18n";
import { area as turfArea } from "@turf/turf";
import { KZ_REGIONS, KZ_CENTER, KZ_ZOOM, getRegionName, KzRegion, KzDistrict } from "@/lib/kz-regions";

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
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedRegionIdx, setSelectedRegionIdx] = useState<number | null>(null);
  const [selectedDistrictIdx, setSelectedDistrictIdx] = useState<number | null>(null);
  const [selectedCityIdx, setSelectedCityIdx] = useState<number | null>(null);
  const [filterTab, setFilterTab] = useState<"region" | "crops">("region");

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
      const res = await fetch("http://localhost:3008/farm-plots", {
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
        <Map
          ref={mapRef}
          onGeometrySelected={handleMapDraw}
          drawModeActive={isDrawing}
          rulerModeActive={isRulerActive}
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

        {/* 2. Top-Left Floating Panel — Region Filter + Crops */}
        <div className="absolute top-6 left-6 z-10 w-64">
          <Card className="shadow-lg border-none bg-white/95 backdrop-blur-md rounded-[1.5rem] p-0 max-h-[55vh] overflow-hidden flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-[#F0F5EE]">
              <button onClick={() => setFilterTab("region")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all ${filterTab === 'region' ? 'text-[#2F6B3D] border-b-2 border-[#2F6B3D]' : 'text-[#2F6B3D]/30'}`}>
                {t.regionFilter || 'Регионы'}
              </button>
              <button onClick={() => setFilterTab("crops")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all ${filterTab === 'crops' ? 'text-[#2F6B3D] border-b-2 border-[#2F6B3D]' : 'text-[#2F6B3D]/30'}`}>
                {t.crops}
              </button>
            </div>

            <div className="overflow-y-auto p-4 custom-scrollbar" style={{ maxHeight: 'calc(55vh - 44px)' }}>
              {filterTab === "region" ? (
                <div className="space-y-3">
                  {/* Oblast Select */}
                  <div>
                    <label className="text-[9px] font-black text-[#2F6B3D]/40 uppercase ml-1 mb-1 block">{t.selectRegion || 'Область'}</label>
                    <select
                      className="w-full h-10 rounded-xl bg-[#F5F9F4] px-3 text-xs font-bold text-[#2F6B3D] border-none shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/20"
                      value={selectedRegionIdx ?? ""}
                      onChange={(e) => {
                        const idx = e.target.value === "" ? null : Number(e.target.value);
                        setSelectedRegionIdx(idx);
                        setSelectedDistrictIdx(null);
                        setSelectedCityIdx(null);
                        if (idx !== null) {
                          const r = KZ_REGIONS[idx];
                          mapRef.current?.flyToRegion(r.center, r.zoom);
                        }
                      }}
                    >
                      <option value="">{t.allKazakhstan || 'Весь Казахстан'}</option>
                      {KZ_REGIONS.map((r, i) => (
                        <option key={i} value={i}>{getRegionName(r, language)}</option>
                      ))}
                    </select>
                  </div>

                  {/* District Select */}
                  {selectedRegionIdx !== null && KZ_REGIONS[selectedRegionIdx].districts.length > 0 && (
                    <div>
                      <label className="text-[9px] font-black text-[#2F6B3D]/40 uppercase ml-1 mb-1 block">{t.selectDistrict || 'Район'}</label>
                      <select
                        className="w-full h-10 rounded-xl bg-[#F5F9F4] px-3 text-xs font-bold text-[#2F6B3D] border-none shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/20"
                        value={selectedDistrictIdx ?? ""}
                        onChange={(e) => {
                          const idx = e.target.value === "" ? null : Number(e.target.value);
                          setSelectedDistrictIdx(idx);
                          setSelectedCityIdx(null);
                          if (idx !== null) {
                            const d = KZ_REGIONS[selectedRegionIdx!].districts[idx];
                            mapRef.current?.flyToRegion(d.center, d.zoom);
                          }
                        }}
                      >
                        <option value="">—</option>
                        {KZ_REGIONS[selectedRegionIdx].districts.map((d, i) => (
                          <option key={i} value={i}>{getRegionName(d, language)}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* City Select */}
                  {selectedRegionIdx !== null && selectedDistrictIdx !== null && (() => {
                    const cities = KZ_REGIONS[selectedRegionIdx].districts[selectedDistrictIdx]?.cities || [];
                    if (cities.length === 0) return null;
                    return (
                      <div>
                        <label className="text-[9px] font-black text-[#2F6B3D]/40 uppercase ml-1 mb-1 block">{t.selectCity || 'Город'}</label>
                        <select
                          className="w-full h-10 rounded-xl bg-[#F5F9F4] px-3 text-xs font-bold text-[#2F6B3D] border-none shadow-inner focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/20"
                          value={selectedCityIdx ?? ""}
                          onChange={(e) => {
                            const idx = e.target.value === "" ? null : Number(e.target.value);
                            setSelectedCityIdx(idx);
                            if (idx !== null) {
                              const c = cities[idx];
                              mapRef.current?.flyToRegion(c.center, c.zoom);
                            }
                          }}
                        >
                          <option value="">—</option>
                          {cities.map((c, i) => (
                            <option key={i} value={i}>{getRegionName(c, language)}</option>
                          ))}
                        </select>
                      </div>
                    );
                  })()}

                  {/* Reset */}
                  {selectedRegionIdx !== null && (
                    <button
                      onClick={() => {
                        setSelectedRegionIdx(null);
                        setSelectedDistrictIdx(null);
                        setSelectedCityIdx(null);
                        mapRef.current?.flyToRegion(KZ_CENTER, KZ_ZOOM);
                      }}
                      className="w-full h-9 rounded-xl bg-red-50 text-red-500 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-red-100 active:scale-95 transition-all mt-1"
                    >
                      <RotateCcw className="size-3" />
                      {t.resetFilter || 'Сбросить'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {cropList.map((crop) => (
                    <div key={crop.key} className="flex items-center gap-3 py-1.5 px-1 rounded-lg hover:bg-[#F5F9F4] transition-colors">
                      <div className="size-7 rounded-full bg-white flex items-center justify-center text-xs shadow-sm border border-[#F0F5EE]">{crop.emoji}</div>
                      <span className="text-[13px] font-bold text-[#2F6B3D]">{(cropLabels[language] as any)[crop.key]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 3. Right-side Controls (shifted left to avoid zoom overlap) */}
        <div className="absolute top-6 right-28 z-10 flex flex-col gap-3">
          <button 
            onClick={() => mapRef.current?.focusCurrentLocation()}
            className="size-16 rounded-[1.5rem] bg-white/92 shadow-[0_18px_40px_rgba(0,0,0,0.15)] backdrop-blur-md flex items-center justify-center text-[#2F6B3D] hover:bg-[#F5F9F4] transition-all active:scale-95 border border-white/20"
            title={t.noLocation}
          >
            <Navigation2 className="size-8 fill-[#2F6B3D]/10 text-[#2F6B3D]" />
          </button>

          <button 
            onClick={() => {
              setIsRulerActive(!isRulerActive);
              if (isDrawing) setIsDrawing(false);
            }}
            className={`size-16 rounded-[1.5rem] shadow-[0_18px_40px_rgba(0,0,0,0.15)] backdrop-blur-md flex items-center justify-center transition-all active:scale-95 border border-white/20 ${isRulerActive ? 'bg-[#2F6B3D] text-white' : 'bg-white/92 text-[#2F6B3D] hover:bg-[#F5F9F4]'}`}
            title={t.ruler}
          >
            <Ruler className="size-8" />
          </button>
        </div>

        {/* 4. Bottom-Right Floating CTA */}
        <div className="absolute bottom-24 right-6 z-10 flex gap-3">
          {isDrawing && (
            <Button 
              className="h-16 px-5 rounded-[1.5rem] bg-red-500 text-white shadow-2xl shadow-red-500/30 hover:scale-105 transition-transform flex items-center gap-2 font-black text-base"
              onClick={() => setIsDrawing(false)}
            >
              <X className="size-5 stroke-[3px]" />
              {t.cancelDrawing}
            </Button>
          )}
          <Button 
            className={`h-16 px-7 rounded-[1.5rem] text-white shadow-2xl shadow-green-900/40 hover:scale-105 transition-transform flex items-center gap-3 font-black text-lg ${isDrawing ? 'bg-[#2F6B3D]/60' : 'bg-[#2F6B3D]'}`}
            onClick={() => setIsDrawing(true)}
            disabled={isDrawing}
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
            {cropList.map((crop) => (
              <option key={crop.key} value={(cropLabels[language] as any)[crop.key]}>
                {crop.emoji} {(cropLabels[language] as any)[crop.key]}
              </option>
            ))}
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
