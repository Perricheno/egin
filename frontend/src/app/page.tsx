"use client";

import { useState, useRef, useEffect } from "react";
import Map, { MapRef } from "@/components/map/Map";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActionModal from "@/components/ui/action-modal";
import MarketView from "@/components/ui/market-view";
import ProfileView from "@/components/ui/profile-view";
import AdminView from "@/components/ui/admin-view";
import { Map as MapIcon, ShoppingBasket, User, Navigation2, Plus, Shield, PenTool, Eraser, MousePointer2, Focus, Hexagon, Spline, MapPin, Save } from "lucide-react";

export default function Home() {
  const mapRef = useRef<MapRef>(null);
  const [isPoleOpen, setIsPoleOpen] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
  const [selectedCrop, setSelectedCrop] = useState("Арбуз");
  const [plotTitle, setPlotTitle] = useState("Мое новое поле");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "market" | "profile" | "admin">("map");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Advanced Tools state
  const [drawMode, setDrawMode] = useState<string>("simple_select");
  const [measurement, setMeasurement] = useState<string | null>(null);

  // Edit plot state
  const [editPlotData, setEditPlotData] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCrop, setEditCrop] = useState("Арбуз");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handlePlotClick = (plot: any) => {
    setEditPlotData(plot);
    setEditTitle(plot.title || "");
    setEditCrop(plot.cropType || "Арбуз");
    setIsEditModalOpen(true);
  };

  const updatePlot = async () => {
    if (!editPlotData) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch(`http://localhost:3000/farm-plots/${editPlotData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle, cropType: editCrop })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        mapRef.current?.refreshPlots();
      }
    } catch (e) { alert("Ошибка при обновлении"); }
    finally { setIsSubmitting(false); }
  };

  const deletePlot = async () => {
    if (!editPlotData) return;
    if (!confirm("Вы уверены, что хотите удалить этот участок?")) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch(`http://localhost:3000/farm-plots/${editPlotData.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        mapRef.current?.refreshPlots();
      }
    } catch (e) { alert("Ошибка при удалении"); }
    finally { setIsSubmitting(false); }
  };

  useEffect(() => {
    const token = localStorage.getItem("agro_token");
    if (token) setIsLoggedIn(true);
  }, []);

  const handleAuthSuccess = (authData: any) => {
    localStorage.setItem("agro_token", authData.access_token);
    if (authData.user?.fullName) {
      localStorage.setItem("agro_user_name", authData.user.fullName);
    }
    setIsLoggedIn(true);
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
      alert("Сначала нарисуйте участок на карте!");
      setIsPoleOpen(false);
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
          title: plotTitle,
          region: "Алматинская",
          district: "Талгарский",
          areaSizeHectares: 25.5,
          geometry: JSON.stringify(drawnGeometry),
          cropType: selectedCrop,
          seasonYear: 2024
        })
      });

      const json = await res.json();
      
      if (json.success) {
        alert(`Поле сохранено!\n\nСтатус анализа: ${json.data.analysis.riskLevel}\n${json.data.analysis.message}`);
        mapRef.current?.refreshPlots();
      } else {
        alert("Ошибка: " + json.message);
      }
    } catch (e) {
      alert("Ошибка при сохранении.");
    } finally {
      setIsSubmitting(false);
      setIsPoleOpen(false);
    }
  };

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#EAF3E7] font-sans">
      {!isLoggedIn && <AuthView onSuccess={handleAuthSuccess} />}
      
      {/* 1. Full-screen Map Background */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-300 ${activeTab === 'map' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <Map 
          ref={mapRef} 
          onPlotClick={handlePlotClick} 
          onModeChange={setDrawMode}
          onMeasurement={setMeasurement}
        />
      </div>

      {activeTab === 'market' && <MarketView />}
      {activeTab === 'profile' && <ProfileView />}
      {activeTab === 'admin' && <AdminView />}

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
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-[#F5F9F4] flex items-center justify-center text-[10px] shadow-sm">🌽</div>
                <span className="text-sm font-bold text-[#2F6B3D]">Кукуруза</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="size-6 rounded-full bg-[#F5F9F4] flex items-center justify-center text-[10px] shadow-sm">🍎</div>
                <span className="text-sm font-bold text-[#2F6B3D]">Яблоня</span>
              </div>
            </div>
          </Card>
        </div>

        {/* 3. Top-Right Location Button */}
        <div className="absolute top-6 right-6 z-10 flex flex-col gap-4 items-center">
          <Button size="icon" className="size-13 rounded-2xl bg-white/90 backdrop-blur-md text-[#2F6B3D] shadow-xl border-none hover:bg-white transition-all">
            <Navigation2 className="size-6 fill-[#2F6B3D]" />
          </Button>

          {/* Professional GIS Toolbar */}
          <div className="bg-white/90 backdrop-blur-md shadow-xl rounded-3xl p-2 flex flex-col gap-1 w-13 items-center">
            {/* Nav & Select */}
            <Button 
              size="icon" variant="ghost"
              className={`size-10 rounded-xl transition-all ${drawMode === 'simple_select' ? 'bg-[#2F6B3D] text-white' : 'text-[#2F6B3D] hover:bg-green-50'}`}
              onClick={() => mapRef.current?.changeDrawMode('simple_select')}
              title="Выбрать объект (Select)"
            ><MousePointer2 className="size-5" /></Button>
            <Button 
              size="icon" variant="ghost"
              className={`size-10 rounded-xl transition-all ${drawMode === 'direct_select' ? 'bg-[#2F6B3D] text-white' : 'text-[#2F6B3D] hover:bg-green-50'}`}
              onClick={() => mapRef.current?.changeDrawMode('direct_select')}
              title="Редактировать узлы (Direct Select)"
            ><Focus className="size-5" /></Button>

            <div className="h-px w-8 bg-black/10 my-1 rounded-full" />

            {/* Draw Geometry */}
            <Button 
              size="icon" variant="ghost"
              className={`size-10 rounded-xl transition-all ${drawMode === 'draw_polygon' ? 'bg-[#2F6B3D] text-white' : 'text-[#2F6B3D] hover:bg-green-50'}`}
              onClick={() => mapRef.current?.changeDrawMode('draw_polygon')}
              title="Нарисовать полигон (Поле)"
            ><Hexagon className="size-5" /></Button>
            <Button 
              size="icon" variant="ghost"
              className={`size-10 rounded-xl transition-all ${drawMode === 'draw_line_string' ? 'bg-[#2F6B3D] text-white' : 'text-[#2F6B3D] hover:bg-green-50'}`}
              onClick={() => mapRef.current?.changeDrawMode('draw_line_string')}
              title="Нарисовать линию (Дорога / Канал)"
            ><Spline className="size-5" /></Button>
            <Button 
              size="icon" variant="ghost"
              className={`size-10 rounded-xl transition-all ${drawMode === 'draw_point' ? 'bg-[#2F6B3D] text-white' : 'text-[#2F6B3D] hover:bg-green-50'}`}
              onClick={() => mapRef.current?.changeDrawMode('draw_point')}
              title="Поставить метку (POI)"
            ><MapPin className="size-5" /></Button>

            <div className="h-px w-8 bg-black/10 my-1 rounded-full" />

            {/* Delete current active draw */}
            <Button 
              size="icon" variant="ghost"
              className="size-10 rounded-xl text-red-500 hover:bg-red-50 transition-all"
              onClick={() => mapRef.current?.deleteSelectedDraw()}
              title="Стереть нарисованное"
            ><Eraser className="size-5" /></Button>
          </div>
        </div>

        {/* 4. Measurement & Save Block */}
        {measurement && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
            <div className="bg-[#2F6B3D]/90 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-bold shadow-xl flex items-center gap-2">
              <span>{measurement}</span>
            </div>
            <Button 
              onClick={handleSaveNewPlot}
              className="px-5 py-6 rounded-2xl bg-[#C6A85E] text-white font-black hover:bg-[#b09450] shadow-xl hover:scale-105 transition-all flex gap-2"
              title="Сохранить выделенный объект в базу"
            >
              <Save className="size-5" />
              Сохранить
            </Button>
          </div>
        )}
      </div>

      <ActionModal 
        isOpen={isPoleOpen}
        onClose={() => setIsPoleOpen(false)}
        title="Новое поле"
        primaryActionText={isSubmitting ? "Сохранение..." : "Сохранить"}
        onPrimaryAction={submitPlot}
      >
        <p className="mb-4 text-[#2F6B3D] font-bold opacity-70">
          Вы выбрали участок. Укажите планируемую культуру:
        </p>
        
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
            <option value="Кукуруза">🌽 Кукуруза</option>
            <option value="Хлопок">☁️ Хлопок</option>
            <option value="Яблоня">🍎 Яблоня</option>
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
            <span className="text-[10px] font-black uppercase tracking-widest">Карта</span>
          </button>
          
          <button 
            onClick={() => setActiveTab("market")}
            className={`flex flex-col items-center gap-1 group transition-all ${activeTab === 'market' ? 'text-[#2F6B3D]' : 'text-muted-foreground hover:text-[#2F6B3D]'}`}
          >
            <div className={`p-3 rounded-2xl group-active:scale-95 transition-all ${activeTab === 'market' ? 'bg-[#2F6B3D] text-white shadow-lg shadow-green-900/20' : ''}`}>
              <ShoppingBasket className="size-6" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Маркет</span>
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
            <span className="text-[10px] font-black uppercase tracking-widest">Профиль</span>
          </button>
        </div>
      </div>
    </main>
  );
}

