"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Settings, LogOut, ChevronRight, ChevronLeft, Map as MapIcon, ShieldCheck, Save, X, Check } from "lucide-react";
import { PlatformLanguage, ui } from "@/lib/i18n";

type ProfileSubView = "main" | "plots" | "deals" | "settings";

export default function ProfileView({ language }: { language: PlatformLanguage }) {
  const t = ui[language];
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [subView, setSubView] = useState<ProfileSubView>("main");
  const [plots, setPlots] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingPlots, setLoadingPlots] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [profile, setProfile] = useState({
    name: "", phone: "", role: "", region: "", district: "",
  });
  const [editForm, setEditForm] = useState({
    fullName: "", phone: "", region: "", district: "",
  });

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "farmer": return t.farmerRole;
      case "seller": return t.sellerRole;
      case "buyer": return t.buyerRole;
      default: return t.farmerRole;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("agro_token");
    if (token) {
      setIsLoggedIn(true);
      const name = localStorage.getItem("agro_user_name") || "";
      const phone = localStorage.getItem("agro_user_phone") || "";
      const role = localStorage.getItem("agro_user_role") || "farmer";
      const region = localStorage.getItem("agro_user_region") || "";
      const district = localStorage.getItem("agro_user_district") || "";
      const savedAvatar = localStorage.getItem("agro_avatar");
      setProfile({ name, phone, role, region, district });
      if (savedAvatar) setAvatar(savedAvatar);
      fetchProfile(token);
    }
  }, []);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch("http://localhost:3008/users/me", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data) {
        const u = json.data;
        const p = {
          name: u.fullName || "", phone: u.phone || "",
          role: u.role || "farmer", region: u.region || "", district: u.district || "",
        };
        setProfile(p);
        localStorage.setItem("agro_user_name", p.name);
        localStorage.setItem("agro_user_phone", p.phone);
        localStorage.setItem("agro_user_role", p.role);
        localStorage.setItem("agro_user_region", p.region);
        localStorage.setItem("agro_user_district", p.district);
      }
    } catch {}
  };

  const fetchPlots = async () => {
    setLoadingPlots(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch("http://localhost:3008/farm-plots", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setPlots(json.data);
    } catch {} finally { setLoadingPlots(false); }
  };

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch("http://localhost:3008/orders/my", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setOrders(json.data);
    } catch {} finally { setLoadingOrders(false); }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setSaveSuccess(false);
    try {
      const token = localStorage.getItem("agro_token");
      const res = await fetch("http://localhost:3008/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: editForm.fullName,
          phone: editForm.phone,
          region: editForm.region,
          district: editForm.district,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const u = json.data;
        const p = { name: u.fullName || "", phone: u.phone || "", role: u.role || "farmer", region: u.region || "", district: u.district || "" };
        setProfile(p);
        localStorage.setItem("agro_user_name", p.name);
        localStorage.setItem("agro_user_phone", p.phone);
        localStorage.setItem("agro_user_region", p.region);
        localStorage.setItem("agro_user_district", p.district);
        setSaveSuccess(true);
        setTimeout(() => { setSaveSuccess(false); setSubView("main"); }, 1500);
      } else {
        const msg = Array.isArray(json.message) ? json.message.join("\n") : json.message;
        alert(msg || "Error saving profile");
      }
    } catch {
      alert("Не удалось сохранить профиль");
    } finally { setSavingProfile(false); }
  };

  const handleLogout = () => {
    ["agro_token","agro_user_name","agro_user_phone","agro_user_role","agro_user_region","agro_user_district","agro_avatar"].forEach(k => localStorage.removeItem(k));
    window.location.reload();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatar(base64);
        localStorage.setItem("agro_avatar", base64);
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="absolute inset-0 z-50 bg-[#EAF3E7] flex flex-col items-center justify-center p-8 text-center h-full">
        <div className="h-24 w-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-green-900/10">
          <User className="size-12 text-[#2F6B3D] opacity-20" />
        </div>
        <h2 className="text-3xl font-black text-[#2F6B3D] mb-3 tracking-tighter">{t.profileRequired}</h2>
        <p className="text-[#2F6B3D]/60 text-sm mb-10 px-6 font-medium leading-relaxed">{t.loginToManage}</p>
        <Button onClick={() => window.location.reload()} className="w-full h-16 rounded-[1.5rem] bg-[#2F6B3D] text-white font-black text-lg shadow-xl active:scale-95 transition-all">
          {t.loginToAgriPlan}
        </Button>
      </div>
    );
  }

  // Settings sub-view
  if (subView === "settings") {
    return (
      <div className="absolute inset-0 z-10 bg-[#EAF3E7] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setSubView("main")} className="text-[#2F6B3D] hover:bg-white/60 bg-white/30 backdrop-blur-md rounded-2xl h-12 w-12 shadow-sm cursor-pointer">
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="text-3xl font-black text-[#2F6B3D] tracking-tighter">{t.editProfile}</h1>
        </div>

        {saveSuccess && (
          <div className="mb-6 p-4 bg-green-100 border border-green-300 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
            <Check className="size-5 text-green-600" />
            <span className="font-bold text-green-700 text-sm">{t.profileSaved}</span>
          </div>
        )}

        <div className="space-y-5">
          <div className="space-y-1">
            <Label className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.fullName}</Label>
            <Input value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="rounded-2xl h-14 bg-white border-none font-bold text-[#2F6B3D] shadow-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.phone}</Label>
            <Input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="rounded-2xl h-14 bg-white border-none font-bold text-[#2F6B3D] shadow-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.region}</Label>
              <Input value={editForm.region} onChange={e => setEditForm({...editForm, region: e.target.value})} className="rounded-2xl h-14 bg-white border-none font-bold text-[#2F6B3D] shadow-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.district}</Label>
              <Input value={editForm.district} onChange={e => setEditForm({...editForm, district: e.target.value})} className="rounded-2xl h-14 bg-white border-none font-bold text-[#2F6B3D] shadow-sm" />
            </div>
          </div>

          {/* Avatar */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.avatarUpdated?.replace("!", "") || "Фото"}</Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-2xl bg-white overflow-hidden shadow-md flex items-center justify-center">
                {avatar ? <img src={avatar} className="w-full h-full object-cover" /> : <User className="size-8 text-[#2F6B3D]/20" />}
              </div>
              <label className="px-4 py-2 bg-[#F5F9F4] text-[#2F6B3D] rounded-xl text-sm font-bold cursor-pointer hover:bg-[#E8F0E5] transition-colors">
                {t.change}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-10">
          <Button onClick={() => setSubView("main")} variant="outline" className="flex-1 h-14 rounded-2xl border-[#2F6B3D]/20 text-[#2F6B3D] font-black">
            <X className="size-4 mr-2" /> {t.cancelDrawing}
          </Button>
          <Button onClick={handleSaveProfile} disabled={savingProfile} className="flex-1 h-14 rounded-2xl bg-[#2F6B3D] text-white font-black shadow-lg active:scale-95 transition-all disabled:opacity-50">
            <Save className="size-4 mr-2" /> {savingProfile ? t.wait : t.saveChanges}
          </Button>
        </div>
      </div>
    );
  }

  // My Plots sub-view
  if (subView === "plots") {
    return (
      <div className="absolute inset-0 z-10 bg-[#EAF3E7] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setSubView("main")} className="text-[#2F6B3D] hover:bg-white/60 bg-white/30 backdrop-blur-md rounded-2xl h-12 w-12 shadow-sm cursor-pointer">
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="text-3xl font-black text-[#2F6B3D] tracking-tighter">{t.myPlots}</h1>
        </div>
        {loadingPlots ? (
          <div className="text-center py-20"><div className="size-8 border-3 border-[#2F6B3D]/20 border-t-[#2F6B3D] animate-spin rounded-full mx-auto" /></div>
        ) : plots.length > 0 ? (
          <div className="space-y-3">
            {plots.map((plot: any) => (
              <Card key={plot.id} className="border-none shadow-md shadow-green-900/5 rounded-[1.5rem] bg-white/80 overflow-hidden">
                <CardContent className="p-4 flex gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-[#F5F9F4] flex items-center justify-center text-2xl shadow-inner shrink-0">🌾</div>
                  <div className="flex flex-col justify-center flex-1">
                    <h3 className="font-extrabold text-[#2F6B3D] text-lg leading-none">{plot.title}</h3>
                    <p className="text-muted-foreground text-xs font-bold mt-1">{plot.cropType} • {plot.areaSizeHectares} {t.hectares}</p>
                    <p className="text-muted-foreground/60 text-[10px] font-bold mt-1 uppercase">{plot.region}, {plot.district}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-40 select-none">
            <MapIcon className="size-16 mx-auto mb-4 text-[#2F6B3D]" />
            <p className="font-black text-[#2F6B3D] text-lg">{t.noPlots}</p>
            <p className="text-sm font-medium text-[#2F6B3D]/60 mt-2">{t.noPlotsHint}</p>
          </div>
        )}
      </div>
    );
  }

  // Deal History sub-view (real orders)
  if (subView === "deals") {
    return (
      <div className="absolute inset-0 z-10 bg-[#EAF3E7] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-right-4 duration-300 pointer-events-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => setSubView("main")} className="text-[#2F6B3D] hover:bg-white/60 bg-white/30 backdrop-blur-md rounded-2xl h-12 w-12 shadow-sm cursor-pointer">
            <ChevronLeft className="size-6" />
          </Button>
          <h1 className="text-3xl font-black text-[#2F6B3D] tracking-tighter">{t.dealsHistory}</h1>
        </div>
        {loadingOrders ? (
          <div className="text-center py-20"><div className="size-8 border-3 border-[#2F6B3D]/20 border-t-[#2F6B3D] animate-spin rounded-full mx-auto" /></div>
        ) : orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order: any) => (
              <Card key={order.id} className="border-none shadow-md rounded-[1.5rem] bg-white/80 overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-[#2F6B3D]/40 uppercase">{t.orderDate}: {new Date(order.createdAt).toLocaleDateString()}</span>
                    <span className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase ${order.status === 'completed' ? 'bg-green-100 text-green-700' : order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                      {order.status}
                    </span>
                  </div>
                  {order.items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center py-1.5 border-t border-[#F5F9F4]">
                      <span className="text-sm font-bold text-[#2F6B3D]">{item.title}</span>
                      <span className="text-xs font-bold text-muted-foreground">{item.quantity} {item.unit} × {Number(item.priceAtPurchase).toLocaleString()} {t.pricePer}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#E8F0E5]">
                    <span className="font-black text-[#2F6B3D] text-sm">{t.orderTotal}:</span>
                    <span className="font-black text-[#C6A85E] text-lg">{Number(order.totalPrice).toLocaleString()} {t.pricePer}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 opacity-40 select-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-[#C6A85E]">
              <path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            <p className="font-black text-[#2F6B3D] text-lg">{t.noDeals}</p>
            <p className="text-sm font-medium text-[#2F6B3D]/60 mt-2">{t.noDealsHint}</p>
          </div>
        )}
      </div>
    );
  }

  // Main profile view
  return (
    <div className="absolute inset-0 z-10 bg-[#EAF3E7] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
      <div className="flex justify-between items-center mb-10 mt-2">
        <h1 className="text-4xl font-black text-[#2F6B3D] tracking-tighter">{t.profile}</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => {
            setEditForm({ fullName: profile.name, phone: profile.phone, region: profile.region, district: profile.district });
            setSubView("settings");
          }}
          className="text-[#2F6B3D] hover:bg-white/60 bg-white/30 backdrop-blur-md rounded-2xl h-12 w-12 shadow-sm cursor-pointer active:scale-90 transition-all"
        >
          <Settings className="size-6" />
        </Button>
      </div>

      <div className="flex items-center gap-6 mb-12">
        <div onClick={() => document.getElementById("avatar-input")?.click()} className="h-28 w-28 rounded-[2.5rem] bg-white flex items-center justify-center p-1 relative border-none shadow-2xl shadow-green-900/15 cursor-pointer hover:scale-105 active:scale-95 transition-all group overflow-hidden">
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-[2.3rem]" />
          ) : (
            <div className="flex flex-col items-center justify-center text-[#2F6B3D]/40">
              <User className="size-12 mb-1" />
              <span className="text-[10px] font-black uppercase opacity-60">{t.upload}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase">{t.change}</div>
          <input id="avatar-input" type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#2F6B3D] leading-none tracking-tight">{profile.name}</h2>
          <p className="text-[#2F6B3D]/40 text-sm font-bold">{profile.phone}</p>
          <div className="inline-flex items-center gap-2 mt-3 bg-[#2F6B3D] text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-lg shadow-green-900/20">
            <ShieldCheck className="size-3.5" />
            {getRoleLabel(profile.role)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Card onClick={() => { setSubView("plots"); fetchPlots(); }} className="border-none shadow-xl shadow-green-900/5 rounded-[2rem] bg-white/80 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer overflow-hidden group">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-50/50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors"><MapIcon className="size-6" /></div>
              <div className="flex flex-col">
                <span className="font-black text-[#2F6B3D] text-lg leading-tight uppercase tracking-tight">{t.myPlots}</span>
                <span className="text-[10px] font-bold text-[#2F6B3D]/40 uppercase">{t.activeTerritory}</span>
              </div>
            </div>
            <ChevronRight className="size-6 text-[#2F6B3D]/20 group-hover:text-[#2F6B3D] transition-colors" />
          </CardContent>
        </Card>
        
        <Card onClick={() => { setSubView("deals"); fetchOrders(); }} className="border-none shadow-xl shadow-green-900/5 rounded-[2rem] bg-white/80 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer overflow-hidden group">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-[#C6A85E]/10 text-[#C6A85E] rounded-2xl group-hover:bg-[#C6A85E] group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-[#2F6B3D] text-lg leading-tight uppercase tracking-tight">{t.dealsHistory}</span>
                <span className="text-[10px] font-bold text-[#2F6B3D]/40 uppercase text-amber-600/60">{t.completedDeals}</span>
              </div>
            </div>
            <ChevronRight className="size-6 text-[#2F6B3D]/20 group-hover:text-[#2F6B3D] transition-colors" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-14 pb-10">
        <Button onClick={handleLogout} variant="outline" className="w-full h-18 rounded-[1.5rem] border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500 flex items-center gap-4 font-black text-base uppercase tracking-widest cursor-pointer active:scale-95 transition-all shadow-lg shadow-red-500/5">
          <LogOut className="size-5 stroke-[3px]" />
          {t.logout}
        </Button>
      </div>
    </div>
  );
}
