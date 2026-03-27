"use client";

import { useState, useRef, useEffect } from "react";
import Map, { MapRef } from "@/components/map/Map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActionModal from "@/components/ui/action-modal";
import MarketView from "@/components/ui/market-view";
import ProfileView from "@/components/ui/profile-view";
import AdminView from "@/components/ui/admin-view";
import AuthView from "@/components/ui/auth-view";
import { cropLabels, cropList, PlatformLanguage, ui } from "@/lib/i18n";
import { area as turfArea } from "@turf/turf";
import { KZ_REGIONS, KZ_CENTER, KZ_ZOOM, getRegionName, KzRegion, KzDistrict } from "@/lib/kz-regions";
import { Map as MapIcon, ShoppingBasket, User, Navigation2, Plus, Shield, PenTool, Eraser, MousePointer2, Focus, Hexagon, Spline, MapPin, Save, RotateCcw, Ruler, Wand2, Sparkles, Loader2, Grid } from "lucide-react";
import { AutoToolType } from "@/lib/turf-tools";

export default function Home() {
  const mapRef = useRef<MapRef>(null);

  // Tabs and general state
  const [activeTab, setActiveTab] = useState<"map" | "market" | "profile" | "admin">("map");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Region and Language State
  const [language, setLanguage] = useState<PlatformLanguage>("ru");
  const [filterTab, setFilterTab] = useState<"region" | "crops">("region");
  const [selectedRegionIdx, setSelectedRegionIdx] = useState<number | null>(null);
  const [selectedDistrictIdx, setSelectedDistrictIdx] = useState<number | null>(null);
  const [selectedCityIdx, setSelectedCityIdx] = useState<number | null>(null);

  // Professional Map Toolbar State
  const [drawMode, setDrawMode] = useState<string>("simple_select");
  const [measurement, setMeasurement] = useState<string | null>(null);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isProcessingWand, setIsProcessingWand] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'error' | 'warning' | 'success'} | null>(null);

  // Drawing and Submission State
  const [isPoleOpen, setIsPoleOpen] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
  const [fieldName, setFieldName] = useState("Орёл 22");
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [fillColor, setFillColor] = useState<string>("#888888");

  // Edit plot state
  const [editPlotData, setEditPlotData] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCrop, setEditCrop] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const t = ui[language] || ui.ru;
  const areaSizeHectares = drawnGeometry
    ? turfArea({ type: "Feature", geometry: drawnGeometry, properties: {} }) / 10000
    : 0;

  useEffect(() => {
    const token = localStorage.getItem("agro_token");
    if (token) setIsLoggedIn(true);
    setSelectedCrop(cropLabels[language].watermelon);
    setEditCrop(cropLabels[language].watermelon);
  }, [language]);

  const handleAuthSuccess = (authData: any) => {
    localStorage.setItem("agro_token", authData.access_token);
    setIsLoggedIn(true);
  };

  const handlePlotClick = (plot: any) => {
    setEditPlotData(plot);
    setEditTitle(plot.title || "");
    setEditCrop(plot.cropType || (cropLabels[language] as any).watermelon);
    setFillColor(plot.fillColor || "#888888");
    setIsEditModalOpen(true);
  };

  const updatePlot = async () => {
    if (!editPlotData) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch(`http://localhost:3008/farm-plots/${editPlotData.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ title: editTitle, cropType: editCrop, fillColor })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        mapRef.current?.refreshPlots();
      } else {
        alert("Failed to update field");
      }
    } catch (e) {
      alert("Error updating field");
    } finally {
      setIsSubmitting(false);
    }
  };

  const showNotification = (msg: string, type: 'error' | 'warning' | 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const deletePlot = async () => {
    if (!editPlotData) return;
    if (!confirm((t as any).deletePlotConfirm || "Вы уверены, что хотите удалить этот участок?")) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch(`http://localhost:3008/farm-plots/${editPlotData.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        mapRef.current?.refreshPlots();
      }
    } catch (e) {
      alert("Error deleting field");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewPlot = () => {
    const geom = mapRef.current?.getSelectedGeometry();
    if (!geom) {
      alert(t.drawFieldFirst || "Сначала выделите нарисованный объект на карте (стрелкой)!");
      return;
    }
    setDrawnGeometry(geom);
    setIsPoleOpen(true);
  };

  const submitPlot = async () => {
    if (!drawnGeometry) { alert(t.drawFieldFirst); return; }
    if (!fieldName.trim()) { alert(`${t.fieldName}: ${t.fieldNamePlaceholder}`); return; }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch("http://localhost:3008/farm-plots", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          title: fieldName.trim(),
          region: "Алматинская",
          district: "Талгарский",
          areaSizeHectares: Number(areaSizeHectares.toFixed(2)),
          geometry: drawnGeometry,
          cropType: selectedCrop,
          fillColor,
          seasonYear: 2024
        })
      });

      const json = await res.json();
      if (json.success) {
        alert(`${t.plotSaved || 'Участок сохранен'}\n\n${json.data.analysis?.message || ''}`);
        mapRef.current?.refreshPlots();
      } else {
        alert("Ошибка: " + json.message);
      }
    } catch (e) {
      alert(t.saveError || "Error saving");
    } finally {
      setIsSubmitting(false);
      setIsPoleOpen(false);
      mapRef.current?.deleteSelectedDraw();
      mapRef.current?.changeDrawMode('simple_select');
    }
  };

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#EAF3E7] font-sans">
      {!isLoggedIn && <AuthView onSuccess={handleAuthSuccess} {...({language} as any)} />}

      {/* Dynamic Toast Notifications */}
      {notification && (
        <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full shadow-2xl font-black text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-10 ${
          notification.type === 'error' ? 'bg-red-500 text-white' : 
          notification.type === 'warning' ? 'bg-yellow-500 text-white' : 
          'bg-[#2F6B3D] text-white'
        }`}>
          {notification.type === 'error' ? '❌' : notification.type === 'warning' ? '⚠️' : '✅'} {notification.msg}
        </div>
      )}

      {/* Map Background */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-300 ${activeTab === 'map' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <Map
          ref={mapRef}
          onPlotClick={handlePlotClick}
          onModeChange={setDrawMode}
          onMeasurement={setMeasurement}
          language={language}
          showMeasurements={isRulerActive}
          massWandActive={drawMode === 'mass_magic_wand'}
          onProcessingStateChange={setIsProcessingWand}
          onNotification={showNotification}
        />
      </div>

      {activeTab === 'market' && <MarketView {...({language} as any)} />}
      {activeTab === 'profile' && <ProfileView {...({language} as any)} />}
      {activeTab === 'admin' && <AdminView />}

      {/* Map UI */}
      <div className={activeTab === 'map' ? 'block' : 'hidden'}>
        {/* Language Selection Header */}
        <div className="absolute top-6 left-1/2 z-20 -translate-x-1/2">
          <div className="flex items-center gap-1 rounded-full bg-white/88 p-1 shadow-lg backdrop-blur-md">
            {(["ru", "kk", "en"] as PlatformLanguage[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang)}
                className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${
                  language === lang ? "bg-[#2F6B3D] text-white" : "text-[#2F6B3D]/60 hover:bg-[#F5F9F4]"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>
        </div>

        {/* Top-Left Dynamic Filter Panel - Repositioned for Responsive Sidebar */}
        <div className="absolute top-6 left-6 z-10 w-64 pointer-events-auto transition-all duration-500 lg:left-[120px]">
          <Card className="shadow-lg border-none bg-white/95 backdrop-blur-md rounded-[1.5rem] p-0 max-h-[55vh] overflow-hidden flex flex-col">
            <div className="flex border-b border-[#F0F5EE]">
              <button onClick={() => setFilterTab("region")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all ${filterTab === 'region' ? 'text-[#2F6B3D] border-b-2 border-[#2F6B3D]' : 'text-[#2F6B3D]/30'}`}>
                {t.regionFilter || 'Регионы'}
              </button>
              <button onClick={() => setFilterTab("crops")} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-all ${filterTab === 'crops' ? 'text-[#2F6B3D] border-b-2 border-[#2F6B3D]' : 'text-[#2F6B3D]/30'}`}>
                {t.crops || 'Культуры'}
              </button>
            </div>
            
            <div className="overflow-y-auto p-4 custom-scrollbar" style={{ maxHeight: 'calc(55vh - 44px)' }}>
              {filterTab === "region" ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-[#2F6B3D]/40 uppercase ml-1 mb-1 block">{t.selectRegion || 'Область'}</label>
                    <select
                      className="w-full h-10 rounded-xl bg-[#F5F9F4] px-3 text-xs font-bold text-[#2F6B3D] shadow-inner focus:outline-none"
                      value={selectedRegionIdx ?? ""}
                      onChange={(e) => {
                        const idx = e.target.value === "" ? null : Number(e.target.value);
                        setSelectedRegionIdx(idx); setSelectedDistrictIdx(null); setSelectedCityIdx(null);
                        if (idx !== null) {
                          const r = KZ_REGIONS[idx];
                          mapRef.current?.flyToRegion(r.center, r.zoom);
                        }
                      }}
                    >
                      <option value="">{t.allKazakhstan || 'Весь Казахстан'}</option>
                      {KZ_REGIONS.map((r, i) => <option key={i} value={i}>{getRegionName(r, language)}</option>)}
                    </select>
                  </div>

                  {selectedRegionIdx !== null && KZ_REGIONS[selectedRegionIdx].districts.length > 0 && (
                    <div>
                      <label className="text-[9px] font-black text-[#2F6B3D]/40 uppercase ml-1 mb-1 block">{t.selectDistrict || 'Район'}</label>
                      <select
                        className="w-full h-10 rounded-xl bg-[#F5F9F4] px-3 text-xs font-bold text-[#2F6B3D] shadow-inner focus:outline-none"
                        value={selectedDistrictIdx ?? ""}
                        onChange={(e) => {
                          const idx = e.target.value === "" ? null : Number(e.target.value);
                          setSelectedDistrictIdx(idx); setSelectedCityIdx(null);
                          if (idx !== null) {
                            const d = KZ_REGIONS[selectedRegionIdx!].districts[idx];
                            mapRef.current?.flyToRegion(d.center, d.zoom);
                          }
                        }}
                      >
                        <option value="">—</option>
                        {KZ_REGIONS[selectedRegionIdx].districts.map((d, i) => <option key={i} value={i}>{getRegionName(d, language)}</option>)}
                      </select>
                    </div>
                  )}
                  {selectedRegionIdx !== null && (
                    <button
                      onClick={() => {
                        setSelectedRegionIdx(null); setSelectedDistrictIdx(null); setSelectedCityIdx(null);
                        mapRef.current?.flyToRegion(KZ_CENTER, KZ_ZOOM);
                      }}
                      className="w-full h-9 rounded-xl bg-red-50 text-red-500 text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all mt-1"
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

        {/* Top-Right Professional GIS Toolbar */}
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-4 pointer-events-auto">
          <div className="group bg-white/95 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[24px] p-3 flex flex-col items-start border border-white/40 transition-all duration-300 ease-out w-[64px] hover:w-[210px] overflow-hidden">
            {/* GROUP: Навигация */}
            <div className="w-full flex justify-center group-hover:justify-start group-hover:pl-2 transition-all duration-300">
              <span className="text-[8px] font-black uppercase tracking-widest text-[#2F6B3D]/40 mb-2 mt-1 whitespace-nowrap">Вид</span>
            </div>
            
            <Button variant="ghost" className="h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden mb-1 text-[#2F6B3D] hover:bg-green-50" onClick={() => mapRef.current?.focusCurrentLocation()} title={t.noLocation || 'Где я?'}>
              <Navigation2 className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Моя локация</span>
            </Button>
            
            <Button variant="ghost" onClick={() => setIsRulerActive(!isRulerActive)} className={`h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden ${isRulerActive ? 'bg-[#2F6B3D] text-white' : 'text-[#2F6B3D] hover:bg-green-50'}`} title="Линейки измерений">
              <Ruler className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Измерения</span>
            </Button>

            <div className="h-px w-10 group-hover:w-full bg-[#2F6B3D]/10 my-3 transition-all duration-300" />

            {/* GROUP: Выделение */}
            <div className="w-full flex justify-center group-hover:justify-start group-hover:pl-2 transition-all duration-300">
               <span className="text-[8px] font-black uppercase tracking-widest text-[#2F6B3D]/40 mb-2 whitespace-nowrap">Курсор</span>
            </div>
            <Button variant="ghost" className={`h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden mb-1 ${drawMode === 'simple_select' ? 'bg-[#2F6B3D] text-white shadow-md' : 'text-[#2F6B3D] hover:bg-green-50'}`} onClick={() => { setDrawMode('simple_select'); mapRef.current?.changeDrawMode('simple_select'); }} title="Выбрать объект (Select)">
              <MousePointer2 className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Указатель</span>
            </Button>
            <Button variant="ghost" className={`h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden ${drawMode === 'direct_select' ? 'bg-[#2F6B3D] text-white shadow-md' : 'text-[#2F6B3D] hover:bg-green-50'}`} onClick={() => { setDrawMode('direct_select'); mapRef.current?.changeDrawMode('direct_select'); }} title="Редактировать узлы (Direct Select)">
              <Focus className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Правка узлов</span>
            </Button>

            <div className="h-px w-10 group-hover:w-full bg-[#2F6B3D]/10 my-3 transition-all duration-300" />

            {/* GROUP: Создание */}
            <div className="w-full flex justify-center group-hover:justify-start group-hover:pl-2 transition-all duration-300">
               <span className="text-[8px] font-black uppercase tracking-widest text-[#2F6B3D]/40 mb-2 whitespace-nowrap">Создание</span>
            </div>
            <Button variant="ghost" className={`h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden mb-1 ${drawMode === 'mass_magic_wand' ? 'bg-[#2F6B3D] text-white shadow-md' : 'text-[#2F6B3D] hover:bg-green-50'}`} onClick={() => { setDrawMode('mass_magic_wand'); mapRef.current?.changeDrawMode('simple_select'); }} title="Массовый захват (Box)">
              {isProcessingWand ? <Loader2 className="size-5 shrink-0 animate-spin"/> : <Sparkles className="size-5 shrink-0" />}
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Масс. захват BBox</span>
            </Button>
            <Button variant="ghost" className={`h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden mb-1 ${drawMode === 'draw_polygon' ? 'bg-[#2F6B3D] text-white shadow-md' : 'text-[#2F6B3D] hover:bg-green-50'}`} onClick={() => { setDrawMode('draw_polygon'); mapRef.current?.changeDrawMode('draw_polygon'); }} title="Полигон">
              <Hexagon className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Полигон (Поле)</span>
            </Button>
            <Button variant="ghost" className={`h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden mb-1 ${drawMode === 'draw_line_string' ? 'bg-[#2F6B3D] text-white shadow-md' : 'text-[#2F6B3D] hover:bg-green-50'}`} onClick={() => { setDrawMode('draw_line_string'); mapRef.current?.changeDrawMode('draw_line_string'); }} title="Нарисовать линию (Дорога/Канал)">
              <Spline className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Линия (Дорога)</span>
            </Button>
            <Button variant="ghost" className={`h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden ${drawMode === 'draw_point' ? 'bg-[#2F6B3D] text-white shadow-md' : 'text-[#2F6B3D] hover:bg-green-50'}`} onClick={() => { setDrawMode('draw_point'); mapRef.current?.changeDrawMode('draw_point'); }} title="Поставить метку">
              <MapPin className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Метка</span>
            </Button>

            <div className="h-px w-10 group-hover:w-full bg-[#2F6B3D]/10 my-3 transition-all duration-300" />

            {/* GROUP: Умные функции */}
            <div className="w-full flex justify-center group-hover:justify-start group-hover:pl-2 transition-all duration-300">
               <span className="text-[8px] font-black uppercase tracking-widest text-[#2F6B3D]/40 mb-2 whitespace-nowrap">СЕТКА / СОТЫ</span>
            </div>
            <Button variant="ghost" className="h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden shadow-sm border border-[#2F6B3D]/20 bg-white text-[#2F6B3D] hover:bg-green-50" onClick={() => mapRef.current?.executeAutoTool('hexGrid_1ha')} title="Сгенерировать соты (Гексагоны) внутри полигона">
              <Grid className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-[#2F6B3D]">Создать соты</span>
            </Button>

            <div className="h-px w-10 group-hover:w-full bg-[#2F6B3D]/10 my-3 transition-all duration-300" />
            
            {/* GROUP: Действия */}
            <div className="w-full flex justify-center group-hover:justify-start group-hover:pl-2 transition-all duration-300">
               <span className="text-[8px] font-black uppercase tracking-widest text-[#2F6B3D]/40 mb-2 whitespace-nowrap">Очистка</span>
            </div>
            <Button variant="ghost" className="h-10 min-h-[40px] w-10 group-hover:w-full rounded-xl flex items-center justify-start p-0 pl-2.5 transition-all duration-300 overflow-hidden text-red-500 hover:bg-red-50" onClick={() => mapRef.current?.deleteSelectedDraw()} title="Удалить выбранное">
              <Eraser className="size-5 shrink-0" />
              <span className="ml-3 text-[13px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">Удалить объект</span>
            </Button>
          </div>
        </div>



        {/* Dynamic Measurement Banner - Moved to Bottom to prevent overlap with Languages */}
        {measurement && (
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-auto">
            <div className="bg-[#2F6B3D] text-white px-6 py-2.5 rounded-full font-black tracking-wider text-sm shadow-[0_10px_30px_rgba(47,107,61,0.4)] border border-white/20 flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase tracking-[0.2em] opacity-60 mb-0.5">Текущее выделение</span>
              {measurement}
            </div>
            <Button onClick={handleSaveNewPlot} className="h-14 px-8 rounded-full bg-[#C6A85E] text-white font-black hover:bg-[#b09450] shadow-xl hover:scale-105 active:scale-95 transition-all outline-none border-2 border-white/20">
              <Save className="size-5 mr-2" />
              {t.save || 'СОХРАНИТЬ В БАЗУ'}
            </Button>
          </div>
        )}
      </div>

      {/* Save New Plot Modal */}
      <ActionModal isOpen={isPoleOpen} onClose={() => setIsPoleOpen(false)} title={t.newField || 'Новый участок'} primaryActionText={isSubmitting ? (t.saving || 'Сохранение...') : (t.save || 'Сохранить')} onPrimaryAction={submitPlot} language={language}>
        <p className="mb-4 text-[#2F6B3D] font-bold opacity-70">{t.chooseCrop || 'Конфигурация'}</p>
        <div className="flex flex-col gap-3 mb-2">
          <div>
            <label className="text-[10px] font-black uppercase text-[#2F6B3D]/50 ml-1">{t.fieldName || 'Название'}</label>
            <input type="text" value={fieldName} onChange={(e) => setFieldName(e.target.value)} className="h-14 w-full rounded-2xl bg-[#F5F9F4] px-4 font-bold text-[#2F6B3D] shadow-inner focus:outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase text-[#2F6B3D]/50 ml-1">Культура</label>
            <select className="h-14 w-full rounded-2xl bg-[#F5F9F4] px-4 font-bold text-[#2F6B3D] shadow-inner focus:outline-none" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)}>
              {cropList.map(c => <option key={c.key} value={(cropLabels[language] as any)[c.key]}>{c.emoji} {(cropLabels[language] as any)[c.key]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
             <label className="text-[10px] font-black uppercase text-[#2F6B3D]/50 ml-1">Свой цвет заливки (Опционально)</label>
             <input type="color" className="h-10 w-full rounded-xl cursor-pointer bg-transparent appearance-none border-none p-0" value={fillColor} onChange={(e) => setFillColor(e.target.value)} />
          </div>
          <div className="rounded-2xl bg-[#F5F9F4] px-4 py-3 text-sm font-bold text-[#2F6B3D] shadow-inner">{t.area || 'Площадь'}: {areaSizeHectares.toFixed(2)} {t.hectares || 'га'}</div>
        </div>
      </ActionModal>

      {/* Edit Existing Plot Modal */}
      <ActionModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Редактирование участка" primaryActionText={isSubmitting ? "Сохранение..." : "Сохранить"} onPrimaryAction={updatePlot} language={language}>
        <p className="mb-4 text-[#2F6B3D] font-bold opacity-70">Измените данные выделенного участка:</p>
        <div className="flex flex-col gap-3 mb-2">
          <input type="text" className="h-14 w-full rounded-2xl bg-[#F5F9F4] px-4 font-bold text-[#2F6B3D] shadow-inner focus:outline-none" placeholder="Название участка" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
          <select className="h-14 w-full rounded-2xl bg-[#F5F9F4] px-4 font-bold text-[#2F6B3D] shadow-inner focus:outline-none" value={editCrop} onChange={(e) => setEditCrop(e.target.value)}>
            {cropList.map(c => <option key={c.key} value={(cropLabels[language] as any)[c.key]}>{c.emoji} {(cropLabels[language] as any)[c.key]}</option>)}
          </select>
          <div className="flex items-center justify-between px-2 bg-[#F5F9F4] rounded-2xl h-14 outline-none border-none">
            <label className="text-xs font-black uppercase text-[#2F6B3D]/50 ml-2">Свой цвет заливки:</label>
            <input type="color" className="w-12 h-10 border-0 outline-none rounded-lg cursor-pointer bg-transparent p-0 mr-2" value={fillColor} onChange={(e) => setFillColor(e.target.value)} />
          </div>
          <button onClick={deletePlot} disabled={isSubmitting} className="w-full flex items-center justify-center h-14 bg-red-50 text-red-600 font-bold rounded-2xl border border-red-100 hover:bg-red-100 transition-colors mt-2">
            Удалить участок
          </button>
        </div>
      </ActionModal>

      {/* Responsive Smart Navigation Bar */}
      <div className="absolute z-50 pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] bottom-6 left-6 right-6 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:left-6 lg:right-auto">
        <div className="w-full lg:w-[88px] h-full mx-auto max-w-md lg:max-w-none bg-white/90 backdrop-blur-2xl border border-white/40 shadow-[0_30px_60px_rgba(0,0,0,0.15)] rounded-[2.5rem] p-3 lg:py-8 lg:px-3 flex flex-row lg:flex-col items-center justify-around lg:justify-center gap-2 lg:gap-8">
          
          <button onClick={() => setActiveTab("map")} className={`flex flex-col items-center gap-2 group transition-all w-16 lg:w-full ${activeTab === 'map' ? 'text-[#2F6B3D] scale-105' : 'text-muted-foreground hover:text-[#2F6B3D] hover:scale-105'}`}>
            <div className={`p-4 xl:p-4 rounded-[1.5rem] group-active:scale-95 transition-all w-full flex justify-center ${activeTab === 'map' ? 'bg-[#2F6B3D] text-white shadow-xl shadow-[#2F6B3D]/30' : 'bg-transparent text-[#2F6B3D]/50 hover:bg-[#2F6B3D]/10'}`}>
               <MapIcon className="size-6 lg:size-7" strokeWidth={activeTab === 'map' ? 2.5 : 2} />
            </div>
            <span className={`text-[9.5px] font-black uppercase tracking-widest transition-colors ${activeTab === 'map' ? 'text-[#2F6B3D]' : 'opacity-0 lg:opacity-100 group-hover:opacity-100'}`}>{t.map || 'Карта'}</span>
          </button>
          
          <button onClick={() => setActiveTab("market")} className={`flex flex-col items-center gap-2 group transition-all w-16 lg:w-full ${activeTab === 'market' ? 'text-[#2F6B3D] scale-105' : 'text-muted-foreground hover:text-[#2F6B3D] hover:scale-105'}`}>
            <div className={`p-4 xl:p-4 rounded-[1.5rem] group-active:scale-95 transition-all w-full flex justify-center ${activeTab === 'market' ? 'bg-[#2F6B3D] text-white shadow-xl shadow-[#2F6B3D]/30' : 'bg-transparent text-[#2F6B3D]/50 hover:bg-[#2F6B3D]/10'}`}>
               <ShoppingBasket className="size-6 lg:size-7" strokeWidth={activeTab === 'market' ? 2.5 : 2} />
            </div>
            <span className={`text-[9.5px] font-black uppercase tracking-widest transition-colors ${activeTab === 'market' ? 'text-[#2F6B3D]' : 'opacity-0 lg:opacity-100 group-hover:opacity-100'}`}>{t.market || 'Рынок'}</span>
          </button>
          
          <button onClick={() => setActiveTab("admin")} className={`flex flex-col items-center gap-2 group transition-all w-16 lg:w-full ${activeTab === 'admin' ? 'text-[#2F6B3D] scale-105' : 'text-muted-foreground hover:text-[#2F6B3D] hover:scale-105'}`}>
            <div className={`p-4 xl:p-4 rounded-[1.5rem] group-active:scale-95 transition-all w-full flex justify-center ${activeTab === 'admin' ? 'bg-[#2F6B3D] text-white shadow-xl shadow-[#2F6B3D]/30' : 'bg-transparent text-[#2F6B3D]/50 hover:bg-[#2F6B3D]/10'}`}>
               <Shield className="size-6 lg:size-7" strokeWidth={activeTab === 'admin' ? 2.5 : 2} />
            </div>
            <span className={`text-[9.5px] font-black uppercase tracking-widest transition-colors ${activeTab === 'admin' ? 'text-[#2F6B3D]' : 'opacity-0 lg:opacity-100 group-hover:opacity-100'}`}>Админка</span>
          </button>
          
          <button onClick={() => setActiveTab("profile")} className={`flex flex-col items-center gap-2 group transition-all w-16 lg:w-full ${activeTab === 'profile' ? 'text-[#2F6B3D] scale-105' : 'text-muted-foreground hover:text-[#2F6B3D] hover:scale-105'}`}>
            <div className={`p-4 xl:p-4 rounded-[1.5rem] group-active:scale-95 transition-all w-full flex justify-center ${activeTab === 'profile' ? 'bg-[#2F6B3D] text-white shadow-xl shadow-[#2F6B3D]/30' : 'bg-transparent text-[#2F6B3D]/50 hover:bg-[#2F6B3D]/10'}`}>
               <User className="size-6 lg:size-7" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
            </div>
            <span className={`text-[9.5px] font-black uppercase tracking-widest transition-colors ${activeTab === 'profile' ? 'text-[#2F6B3D]' : 'opacity-0 lg:opacity-100 group-hover:opacity-100'}`}>{t.profile || 'Профиль'}</span>
          </button>

        </div>
      </div>
    </main>
  );
}
