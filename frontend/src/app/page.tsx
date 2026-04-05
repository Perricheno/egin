"use client";

import { useEffect, useRef, useState } from "react";
import { area as turfArea } from "@turf/turf";
import {
  CircleGauge,
  CloudSun,
  Eraser,
  Focus,
  Grid,
  Hexagon,
  House,
  Loader2,
  Map as MapIcon,
  MapPin,
  MousePointer2,
  Navigation2,
  Plus,
  ReceiptText,
  Ruler,
  Save,
  Shield,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Spline,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import Map, { MapRef } from "@/components/map/Map";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ActionModal from "@/components/ui/action-modal";
import MarketView from "@/components/ui/market-view";
import ProfileView from "@/components/ui/profile-view";
import AdminView from "@/components/ui/admin-view";
import AuthView from "@/components/ui/auth-view";
import { cropLabels, cropList, PlatformLanguage, ui } from "@/lib/i18n";
import { apiUrl } from "@/lib/api";

type ActiveTab = "home" | "map" | "market" | "profile" | "admin";

type DashboardResponse = {
  stats: {
    totalPlots: number;
    cropsCount: number;
    totalAreaHectares: number;
    averageCompetitionLevel: "low" | "medium" | "high";
    averageCompetitionScore: number;
    projectedIncomeKzt: number;
    activeListings: number;
  };
  crops: Array<{
    cropType: string;
    areaHectares: number;
    plotsCount: number;
    fillColor: string | null;
    competitionLevel: "low" | "medium" | "high";
    competitionScore: number;
  }>;
  weather: {
    status: string;
    summary: string;
  };
  insight: {
    title: string;
    message: string;
    confidence: number;
  };
};

type SavedPlotResult = {
  plot: {
    id: string;
    title: string;
    cropType: string;
    areaSizeHectares: number;
    fillColor?: string | null;
  };
  competition: {
    score: number;
    level: "low" | "medium" | "high";
    confidence: number;
    marketplaceVisibility: "hidden" | "visible";
    explanation: string;
    nearbyAreaHectares: number;
    nearbyPlotCount: number;
  };
  projectedIncomeKzt: number;
};

const competitionTone = {
  low: {
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  medium: {
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  },
  high: {
    badge: "bg-red-100 text-red-700 border-red-200",
  },
} as const;

export default function Home() {
  const mapRef = useRef<MapRef>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>("home");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [language, setLanguage] = useState<PlatformLanguage>("ru");
  const [drawMode, setDrawMode] = useState<string>("simple_select");
  const [measurement, setMeasurement] = useState<string | null>(null);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isProcessingWand, setIsProcessingWand] = useState(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  const [notification, setNotification] = useState<{
    msg: string;
    type: "error" | "warning" | "success";
  } | null>(null);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [isDashboardLoading, setIsDashboardLoading] = useState(false);
  const [savedPlotResult, setSavedPlotResult] = useState<SavedPlotResult | null>(null);

  const [isPoleOpen, setIsPoleOpen] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<any>(null);
  const [fieldName, setFieldName] = useState("Орёл 22");
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [fillColor, setFillColor] = useState<string>("#D9B44A");

  const [editPlotData, setEditPlotData] = useState<any>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCrop, setEditCrop] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const t = ui[language] || ui.ru;
  const localizedCompetition = {
    low: language === "kk" ? "Төмен" : "Низкая",
    medium: language === "kk" ? "Орташа" : "Средняя",
    high: language === "kk" ? "Жоғары" : "Высокая",
  } as const;
  const areaSizeHectares = drawnGeometry
    ? turfArea({ type: "Feature", geometry: drawnGeometry, properties: {} }) / 10000
    : 0;

  const fetchDashboard = async () => {
    const token = localStorage.getItem("agro_token");
    if (!token) return;

    setIsDashboardLoading(true);
    try {
      const res = await fetch(apiUrl("/dashboard/home"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDashboard(json.data);
      }
    } catch {
      setDashboard(null);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("agro_token");
    if (token) {
      setIsLoggedIn(true);
      fetchDashboard();
    }
    setSelectedCrop(cropLabels[language].watermelon);
    setEditCrop(cropLabels[language].watermelon);
  }, [language]);

  const handleAuthSuccess = (authData: any) => {
    localStorage.setItem("agro_token", authData.access_token);
    setIsLoggedIn(true);
    fetchDashboard();
  };

  const handlePlotClick = (plot: any) => {
    setEditPlotData(plot);
    setEditTitle(plot.title || "");
    setEditCrop(plot.cropType || (cropLabels[language] as any).watermelon);
    setFillColor(plot.fillColor || "#D9B44A");
    setIsEditModalOpen(true);
  };

  const showNotification = (
    msg: string,
    type: "error" | "warning" | "success",
  ) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const updatePlot = async () => {
    if (!editPlotData) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch(apiUrl(`/farm-plots/${editPlotData.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: editTitle,
          cropType: editCrop,
          fillColor,
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        mapRef.current?.refreshPlots();
        fetchDashboard();
      } else {
        alert("Failed to update field");
      }
    } catch {
      alert("Error updating field");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deletePlot = async () => {
    if (!editPlotData) return;
    if (
      !confirm(
        (t as any).deletePlotConfirm ||
          "Вы уверены, что хотите удалить этот участок?",
      )
    )
      return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch(apiUrl(`/farm-plots/${editPlotData.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        mapRef.current?.refreshPlots();
        fetchDashboard();
      }
    } catch {
      alert("Error deleting field");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveNewPlot = () => {
    const geom = mapRef.current?.getSelectedGeometry();
    if (!geom) {
      alert(
        t.drawFieldFirst ||
          "Сначала выделите нарисованный объект на карте (стрелкой)!",
      );
      return;
    }
    setDrawnGeometry(geom);
    setIsPoleOpen(true);
  };

  const submitPlot = async () => {
    if (!drawnGeometry) {
      alert(t.drawFieldFirst);
      return;
    }
    if (!fieldName.trim()) {
      alert(`${t.fieldName}: ${t.fieldNamePlaceholder}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch(apiUrl("/farm-plots"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: fieldName.trim(),
          region: "Алматинская",
          district: "Талгарский",
          areaSizeHectares: Number(areaSizeHectares.toFixed(2)),
          geometry: drawnGeometry,
          cropType: selectedCrop,
          fillColor,
          seasonYear: 2024,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSavedPlotResult(json.data as SavedPlotResult);
        mapRef.current?.refreshPlots();
        fetchDashboard();
      } else {
        alert("Ошибка: " + json.message);
      }
    } catch {
      alert(t.saveError || "Error saving");
    } finally {
      setIsSubmitting(false);
      setIsPoleOpen(false);
      mapRef.current?.deleteSelectedDraw();
      mapRef.current?.changeDrawMode("simple_select");
    }
  };

  const controlActions = [
    {
      label: language === "kk" ? "Менің орным" : "Моя точка",
      icon: Navigation2,
      onClick: () => mapRef.current?.focusCurrentLocation(),
    },
    {
      label: language === "kk" ? "Сызғыш" : "Линейка",
      icon: Ruler,
      onClick: () => setIsRulerActive(!isRulerActive),
    },
    {
      label: language === "kk" ? "Таңдау" : "Выбор",
      icon: MousePointer2,
      onClick: () => {
        setDrawMode("simple_select");
        mapRef.current?.changeDrawMode("simple_select");
      },
    },
    {
      label: language === "kk" ? "Түзету" : "Правка",
      icon: Focus,
      onClick: () => {
        setDrawMode("direct_select");
        mapRef.current?.changeDrawMode("direct_select");
      },
    },
    {
      label: language === "kk" ? "Алаң сызу" : "Нарисовать поле",
      icon: Hexagon,
      onClick: () => {
        setDrawMode("draw_polygon");
        mapRef.current?.changeDrawMode("draw_polygon");
      },
    },
    {
      label: language === "kk" ? "Сызық" : "Линия",
      icon: Spline,
      onClick: () => {
        setDrawMode("draw_line_string");
        mapRef.current?.changeDrawMode("draw_line_string");
      },
    },
    {
      label: language === "kk" ? "Белгі" : "Метка",
      icon: MapPin,
      onClick: () => {
        setDrawMode("draw_point");
        mapRef.current?.changeDrawMode("draw_point");
      },
    },
    {
      label: language === "kk" ? "Автоанықтау" : "Автоопределение",
      icon: Sparkles,
      onClick: () => {
        setDrawMode("mass_magic_wand");
        mapRef.current?.changeDrawMode("simple_select");
      },
    },
    {
      label: language === "kk" ? "Гекс тор" : "Гекс-сетка",
      icon: Grid,
      onClick: () => mapRef.current?.executeAutoTool("hexGrid_1ha"),
    },
    {
      label: language === "kk" ? "Жою" : "Удалить",
      icon: Eraser,
      onClick: () => mapRef.current?.deleteSelectedDraw(),
    },
  ];

  const statsCards = [
    {
      label: "Поля",
      value: String(dashboard?.stats.totalPlots ?? 0),
      icon: Sprout,
    },
    {
      label: "Доход",
      value: `${Math.round((dashboard?.stats.projectedIncomeKzt ?? 0) / 1000)}k`,
      icon: TrendingUp,
    },
    {
      label: "Бәсеке",
      value: dashboard?.stats.averageCompetitionLevel
        ? localizedCompetition[dashboard.stats.averageCompetitionLevel]
        : localizedCompetition.low,
      icon: CircleGauge,
    },
  ];

  const regionName =
    language === "kk" ? "Алматы облысы" : "Алматинская область";
  const weatherSummary =
    dashboard?.weather.summary?.trim() ||
    (language === "kk"
      ? "Ауа райы сервисі келесі кезеңде қосылады"
      : "Погодный сервис подключим на следующем этапе");
  const insightConfidence = Math.round(
    (dashboard?.insight.confidence ?? 0.25) * 100,
  );
  const localizedVisibility = {
    hidden: language === "kk" ? "Жасырын" : "Скрыто",
    visible: language === "kk" ? "Көрінеді" : "Видно",
  } as const;

  return (
    <main className="relative flex h-screen w-screen flex-col overflow-hidden bg-[#EAF3E7] font-sans">
      {!isLoggedIn && <AuthView onSuccess={handleAuthSuccess} {...({ language } as any)} />}

      {notification && (
        <div
          className={`fixed top-8 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-3 rounded-full px-6 py-3 text-sm font-black shadow-2xl ${
            notification.type === "error"
              ? "bg-red-500 text-white"
              : notification.type === "warning"
                ? "bg-yellow-500 text-white"
                : "bg-[#2F6B3D] text-white"
          }`}
        >
          {notification.msg}
        </div>
      )}

      <div
        className={`absolute inset-0 z-0 transition-opacity duration-300 ${
          activeTab === "map" ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <Map
          ref={mapRef}
          onPlotClick={handlePlotClick}
          onModeChange={setDrawMode}
          onMeasurement={setMeasurement}
          language={language}
          showMeasurements={isRulerActive}
          massWandActive={drawMode === "mass_magic_wand"}
          onProcessingStateChange={setIsProcessingWand}
          onNotification={showNotification}
        />
      </div>

      {activeTab === "home" && (
        <div className="absolute inset-0 z-10 overflow-y-auto bg-[#EEF3EA] pb-28">
          <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col gap-4 px-4 pt-5 pb-6 lg:px-6">
            <div className="rounded-[2rem] bg-[#17381C] px-4 py-4 text-white shadow-[0_24px_80px_rgba(10,26,14,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/50">
                    {language === "kk" ? "Басты бет" : "Главная"}
                  </p>
                  <h1 className="mt-1 text-2xl font-black tracking-tight">
                    {regionName}
                  </h1>
                  <div className="mt-2 flex items-center gap-2 text-sm text-white/72">
                    <CloudSun className="size-4 text-[#D9B44A]" />
                    <span>{weatherSummary}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/72">
                    {language === "kk" ? "0 хабарлама" : "0 уведомлений"}
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-full border border-white/12 bg-white/10">
                    <User className="size-4 text-white/85" />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {statsCards.map(({ label, value, icon: Icon }) => (
                  <div
                    key={label}
                    className="rounded-[1.4rem] border border-white/10 bg-white/8 px-3 py-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                        {label}
                      </span>
                      <Icon className="size-3.5 text-white/68" />
                    </div>
                    <div className="text-lg font-black tracking-tight">{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Card className="rounded-[2rem] border-[#DCE8D7] bg-white p-5 shadow-[0_20px_70px_rgba(17,45,22,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/40">
                      {language === "kk" ? "AI болжам" : "AI прогноз"}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-[#18351D]">
                      {dashboard?.insight.title ||
                        (language === "kk"
                          ? "Әзірге дерек аз"
                          : "Пока мало данных")}
                    </h2>
                  </div>
                  <div className="rounded-full bg-[#F3EFE2] px-3 py-1.5 text-xs font-black text-[#7D692F]">
                    {insightConfidence}%
                  </div>
                </div>

                <p className="mt-3 text-sm leading-relaxed text-[#2F6B3D]/74">
                  {dashboard?.insight.message ||
                    (language === "kk"
                      ? "Алаңдар қосылғаннан кейін мұнда бәсеке болжамы, ауа райы белгілері және әрекет ұсыныстары шығады."
                      : "После добавления полей здесь появятся прогноз по конкуренции, погодные сигналы и рекомендации по действиям.")}
                </p>

                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {(dashboard?.crops.length
                    ? dashboard.crops
                    : cropList.slice(0, 4).map((crop) => ({
                        cropType: (cropLabels[language] as any)[crop.key],
                        fillColor: null,
                      }))
                  ).map((crop: any) => (
                    <div
                      key={crop.cropType}
                      className="flex min-w-fit items-center gap-2 rounded-full bg-[#F3F6EF] px-3 py-2 text-[#2F6B3D]"
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: crop.fillColor || "#D9B44A" }}
                      />
                      <span className="text-xs font-bold">{crop.cropType}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex gap-2">
                  <Button
                    onClick={() => setActiveTab("map")}
                    className="h-11 rounded-full bg-[#2F6B3D] px-4 text-sm font-black text-white hover:bg-[#285b34]"
                  >
                    {language === "kk" ? "Картаны ашу" : "Открыть карту"}
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveTab("map");
                      setDrawMode("draw_polygon");
                      mapRef.current?.changeDrawMode("draw_polygon");
                    }}
                    className="h-11 rounded-full bg-[#D9B44A] px-4 text-sm font-black text-[#17381C] hover:bg-[#e5c15b]"
                  >
                    <Plus className="size-4" />
                    {language === "kk" ? "Алаң қосу" : "Добавить поле"}
                  </Button>
                </div>
              </Card>

              <div className="grid gap-4">
                <Card className="rounded-[2rem] border-[#DCE8D7] bg-white p-5 shadow-[0_20px_70px_rgba(17,45,22,0.08)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/40">
                    {language === "kk" ? "Жаңалықтар" : "Новости"}
                  </p>
                  <div className="mt-3 space-y-3">
                    <div className="rounded-[1.4rem] bg-[#F5F8F1] px-4 py-3">
                      <p className="text-sm font-black text-[#18351D]">
                        {language === "kk" ? "Нарық шолуы" : "Сводка по рынку"}
                      </p>
                      <p className="mt-1 text-sm text-[#2F6B3D]/72">
                        {language === "kk"
                          ? "Баға, сұраныс және бәсекелестер белсенділігі жеке лентада көрсетіледі."
                          : "Цены, спрос и активность конкурентов будут собраны в отдельную ленту."}
                      </p>
                    </div>
                    <div className="rounded-[1.4rem] bg-[#F5F8F1] px-4 py-3">
                      <p className="text-sm font-black text-[#18351D]">
                        {language === "kk" ? "Ауа райы тәуекелі" : "Погодные риски"}
                      </p>
                      <p className="mt-1 text-sm text-[#2F6B3D]/72">
                        {language === "kk"
                          ? "Мұнда жауын, жел және жұмыс уақыты бойынша ескертулер пайда болады."
                          : "Здесь появятся предупреждения по осадкам, ветру и окнам для работ."}
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="rounded-[2rem] border-[#DCE8D7] bg-white p-5 shadow-[0_20px_70px_rgba(17,45,22,0.08)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/40">
                    {language === "kk" ? "Бүгінге" : "На сегодня"}
                  </p>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-start justify-between rounded-[1.4rem] bg-[#17381C] px-4 py-4 text-white">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55">
                          {language === "kk" ? "Шаруашылық ахуалы" : "Пульс хозяйства"}
                        </p>
                        <p className="mt-2 text-base font-black">
                          {isDashboardLoading
                            ? language === "kk"
                              ? "Жүктелуде..."
                              : "Загружаем..."
                            : dashboard?.insight.title ||
                              (language === "kk"
                                ? "Алаң деректерін қосыңыз"
                                : "Добавьте данные по полям")}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] bg-[#F5F8F1] px-4 py-3">
                      <p className="text-sm font-black text-[#18351D]">
                        {language === "kk" ? "Ауа райы" : "Погода"}
                      </p>
                      <p className="mt-1 text-sm text-[#2F6B3D]/72">{weatherSummary}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "market" && <MarketView {...({ language } as any)} />}
      {activeTab === "profile" && <ProfileView {...({ language } as any)} />}
      {activeTab === "admin" && <AdminView />}

      {activeTab === "map" && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-x-0 top-0 px-4 pt-4 lg:px-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
              <div className="pointer-events-auto max-w-md rounded-[1.5rem] border border-white/18 bg-[#16321C]/52 px-3 py-3 text-white shadow-[0_20px_60px_rgba(7,19,10,0.2)] backdrop-blur-xl">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                      Регион
                    </p>
                    <h1 className="mt-1 truncate text-base font-black tracking-tight lg:text-lg">
                      {regionName}
                    </h1>
                    <div className="mt-2 flex items-center gap-2 text-xs text-white/72">
                      <CloudSun className="size-3.5 shrink-0 text-[#F3D38D]" />
                      <span className="truncate">{weatherSummary}</span>
                    </div>
                  </div>

                  <div className="hidden shrink-0 items-start gap-2 md:flex">
                    <div className="rounded-full border border-white/16 bg-white/10 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
                      Карта
                    </div>
                  </div>
                </div>
              </div>

              <div className="pointer-events-auto flex gap-2 overflow-x-auto pb-1 md:hidden">
                {(["ru", "kk"] as PlatformLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-colors ${
                      language === lang
                        ? "border-white bg-white text-[#1F4D2C]"
                        : "border-white/16 bg-[#16321C]/45 text-white/75"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <div className="pointer-events-auto hidden gap-2 overflow-x-auto pb-1 lg:flex">
                {controlActions.map(({ label, icon: Icon, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    className="flex min-w-fit items-center gap-2 rounded-full border border-white/16 bg-[#16321C]/42 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-xl transition-all hover:bg-[#16321C]/56 active:scale-95"
                  >
                    <Icon className="size-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {measurement && (
            <div className="pointer-events-auto absolute bottom-28 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-3 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0">
              <div className="rounded-[1.8rem] border border-white/16 bg-black/30 px-5 py-4 text-white shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.24em] text-white/55">
                    {language === "kk" ? "Ағымдағы таңдау" : "Текущее выделение"}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                    {drawMode.replaceAll("_", " ")}
                  </span>
                </div>
                <div className="text-xl font-black tracking-tight">{measurement}</div>
                <p className="mt-2 text-sm text-white/65">
                  {language === "kk"
                    ? "Бәсеке, табыс және маркеттегі көрінуін есептеу үшін полигонды сақтаңыз."
                    : "Сохраните полигон, чтобы посчитать конкуренцию, доход и видимость в маркете."}
                </p>
              </div>
              <Button
                onClick={handleSaveNewPlot}
                className="h-14 rounded-[1.8rem] bg-[#D9B44A] text-[#17381C] font-black shadow-[0_18px_50px_rgba(217,180,74,0.42)] hover:bg-[#e5c15b]"
              >
                <Save className="mr-2 size-5" />
                Добавить поле
              </Button>
            </div>
          )}

          {savedPlotResult && (
            <div className="pointer-events-auto absolute bottom-28 left-1/2 z-20 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 flex-col gap-3 lg:bottom-8 lg:left-8 lg:translate-x-0">
              <Card className="rounded-[2rem] border-white/16 bg-white/88 p-5 shadow-[0_24px_80px_rgba(9,28,14,0.18)] backdrop-blur-2xl">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#2F6B3D]/45">
                    {language === "kk" ? "Алаң сақталды" : "Поле сохранено"}
                    </p>
                    <h2 className="mt-1 text-xl font-black text-[#18351D]">
                      {savedPlotResult.plot.title}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[#2F6B3D]/70">
                      {savedPlotResult.plot.cropType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedPlotResult(null)}
                    className="flex size-10 items-center justify-center rounded-2xl bg-[#F5F1E8] text-[#2F6B3D] transition-all hover:bg-[#ece4d2]"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-[1.4rem] bg-[#F5F1E8] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                      {language === "kk" ? "Табыс" : "Доход"}
                    </p>
                    <p className="mt-2 text-lg font-black text-[#18351D]">
                      {Math.round(savedPlotResult.projectedIncomeKzt / 1000)}k ₸
                    </p>
                  </div>
                  <div className="rounded-[1.4rem] bg-[#F5F1E8] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                      {language === "kk" ? "Сенім" : "Уверенность"}
                    </p>
                    <p className="mt-2 text-lg font-black text-[#18351D]">
                      {Math.round(savedPlotResult.competition.confidence * 100)}%
                    </p>
                  </div>
                </div>

                <div className="mb-4 flex items-center justify-between rounded-[1.4rem] bg-[#F5F1E8] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                      {language === "kk" ? "Бәсеке" : "Конкуренция"}
                    </p>
                    <p className="mt-1 text-base font-black text-[#18351D]">
                      {localizedCompetition[savedPlotResult.competition.level]}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-black uppercase ${competitionTone[savedPlotResult.competition.level].badge}`}
                  >
                    {localizedVisibility[savedPlotResult.competition.marketplaceVisibility]}
                  </span>
                </div>

                <div className="mb-4 rounded-[1.4rem] bg-[#17381C] px-4 py-4 text-white">
                  <div className="mb-2 flex items-center gap-2">
                    <ReceiptText className="size-4 text-[#D9B44A]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
                      {language === "kk" ? "AI түсіндірме" : "AI объяснение"}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-white/78">
                    {savedPlotResult.competition.explanation}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-[1.2rem] bg-[#F5F1E8] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2F6B3D]/45">
                      {language === "kk" ? "Жақын аумақ" : "Площадь рядом"}
                    </p>
                    <p className="mt-1 font-black text-[#18351D]">
                      {savedPlotResult.competition.nearbyAreaHectares} ha
                    </p>
                  </div>
                  <div className="rounded-[1.2rem] bg-[#F5F1E8] px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#2F6B3D]/45">
                      {language === "kk" ? "Жақын алаңдар" : "Участки рядом"}
                    </p>
                    <p className="mt-1 font-black text-[#18351D]">
                      {savedPlotResult.competition.nearbyPlotCount}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

        </div>
      )}

      <ActionModal
        isOpen={isPoleOpen}
        onClose={() => setIsPoleOpen(false)}
        title={t.newField || "Новый участок"}
        primaryActionText={isSubmitting ? t.saving || "Сохранение..." : t.save || "Сохранить"}
        onPrimaryAction={submitPlot}
        language={language}
      >
        <p className="mb-4 text-[#2F6B3D] font-bold opacity-70">
          {t.chooseCrop || "Конфигурация"}
        </p>
        <div className="mb-2 flex flex-col gap-3">
          <div>
            <label className="ml-1 text-[10px] font-black uppercase text-[#2F6B3D]/50">
              {t.fieldName || "Название"}
            </label>
            <input
              type="text"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              className="h-14 w-full rounded-2xl bg-[#F5F9F4] px-4 font-bold text-[#2F6B3D] shadow-inner focus:outline-none"
            />
          </div>
          <div>
            <label className="ml-1 text-[10px] font-black uppercase text-[#2F6B3D]/50">
              Культура
            </label>
            <select
              className="h-14 w-full rounded-2xl bg-[#F5F9F4] px-4 font-bold text-[#2F6B3D] shadow-inner focus:outline-none"
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
          <div className="flex flex-col gap-1">
            <label className="ml-1 text-[10px] font-black uppercase text-[#2F6B3D]/50">
              Цвет культуры
            </label>
            <input
              type="color"
              className="h-10 w-full cursor-pointer appearance-none rounded-xl border-none bg-transparent p-0"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
            />
          </div>
          <div className="rounded-2xl bg-[#F5F9F4] px-4 py-3 text-sm font-bold text-[#2F6B3D] shadow-inner">
            {t.area || "Площадь"}: {areaSizeHectares.toFixed(2)} {t.hectares || "га"}
          </div>
        </div>
      </ActionModal>

      <ActionModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Редактирование участка"
        primaryActionText={isSubmitting ? "Сохранение..." : "Сохранить"}
        onPrimaryAction={updatePlot}
        language={language}
      >
        <p className="mb-4 text-[#2F6B3D] font-bold opacity-70">
          Измените данные выделенного участка:
        </p>
        <div className="mb-2 flex flex-col gap-3">
          <input
            type="text"
            className="h-14 w-full rounded-2xl bg-[#F5F9F4] px-4 font-bold text-[#2F6B3D] shadow-inner focus:outline-none"
            placeholder="Название участка"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <select
            className="h-14 w-full rounded-2xl bg-[#F5F9F4] px-4 font-bold text-[#2F6B3D] shadow-inner focus:outline-none"
            value={editCrop}
            onChange={(e) => setEditCrop(e.target.value)}
          >
            {cropList.map((crop) => (
              <option key={crop.key} value={(cropLabels[language] as any)[crop.key]}>
                {crop.emoji} {(cropLabels[language] as any)[crop.key]}
              </option>
            ))}
          </select>
          <div className="flex h-14 items-center justify-between rounded-2xl border-none bg-[#F5F9F4] px-2 outline-none">
            <label className="ml-2 text-xs font-black uppercase text-[#2F6B3D]/50">
              Цвет заливки
            </label>
            <input
              type="color"
              className="mr-2 h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0 outline-none"
              value={fillColor}
              onChange={(e) => setFillColor(e.target.value)}
            />
          </div>
          <button
            onClick={deletePlot}
            disabled={isSubmitting}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl border border-red-100 bg-red-50 font-bold text-red-600 transition-colors hover:bg-red-100"
          >
            Удалить участок
          </button>
        </div>
      </ActionModal>

      {activeTab === "map" && (
        <div className="lg:hidden fixed z-[60] pointer-events-auto transition-all duration-500">
          <button
            onClick={() => setIsMobileToolsOpen(!isMobileToolsOpen)}
            className={`fixed bottom-[92px] right-4 z-[61] flex h-12 w-12 items-center justify-center rounded-full shadow-xl transition-all duration-300 active:scale-90 ${
              isMobileToolsOpen
                ? "rotate-45 bg-red-500 text-white shadow-red-500/30"
                : "bg-[#2F6B3D] text-white shadow-[#2F6B3D]/40"
            }`}
          >
            {isMobileToolsOpen ? (
              <X className="size-5" />
            ) : (
              <Plus className="size-5" strokeWidth={3} />
            )}
          </button>

          {isMobileToolsOpen && (
            <div className="fixed bottom-[92px] left-3 right-[68px] z-[60] animate-in slide-in-from-bottom-5 fade-in duration-300">
              <div className="rounded-2xl border border-white/50 bg-white/95 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-2xl">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {controlActions.map(({ label, icon: Icon, onClick }) => (
                    <button
                      key={label}
                      onClick={() => {
                        onClick();
                        setIsMobileToolsOpen(false);
                      }}
                      className={`shrink-0 rounded-xl px-3 py-2.5 text-[11px] font-bold transition-all active:scale-95 ${
                        label === (language === "kk" ? "Жою" : "Удалить")
                          ? "bg-red-50 text-red-500"
                          : "bg-[#F5F9F4] text-[#2F6B3D] hover:bg-green-100"
                      } flex items-center gap-1.5`}
                    >
                      {label ===
                        (language === "kk" ? "Автоанықтау" : "Автоопределение") &&
                      isProcessingWand ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Icon className="size-4" />
                      )}
                      <span className="whitespace-nowrap">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 pointer-events-auto">
        <div className="mx-4 mb-3 flex h-[78px] items-center justify-around rounded-[2rem] border border-white/50 bg-white/86 px-2 shadow-[0_-4px_30px_rgba(0,0,0,0.08)] backdrop-blur-2xl">
          {[
            {
              key: "home" as const,
              icon: House,
              label: language === "kk" ? "Басты бет" : "Главная",
            },
            { key: "map" as const, icon: MapIcon, label: t.map || "Карта" },
            { key: "market" as const, icon: ShoppingBasket, label: t.market || "Маркет" },
            {
              key: "admin" as const,
              icon: Shield,
              label: language === "kk" ? "Әкімші" : "Админ",
            },
            { key: "profile" as const, icon: User, label: t.profile || "Профиль" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 transition-all duration-300 active:scale-90 ${
                activeTab === key ? "text-[#2F6B3D]" : "text-[#9CA3AF]"
              }`}
            >
              {activeTab === key && (
                <div className="absolute -top-0.5 h-[3px] w-5 rounded-full bg-[#2F6B3D]" />
              )}
              <Icon
                className="size-[21px]"
                strokeWidth={activeTab === key ? 2.5 : 1.8}
              />
              <span className="mt-0.5 text-[9px] font-semibold leading-none">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
