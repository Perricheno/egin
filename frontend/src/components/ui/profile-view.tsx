"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Settings, LogOut, ChevronRight, Map as MapIcon, ShieldCheck } from "lucide-react";

export default function ProfileView() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    name: "Иван Петров",
    phone: "+7 701 000 0000",
    role: "Производитель (Фермер)",
  });

  useEffect(() => {
    const token = localStorage.getItem("agro_token");
    const name = localStorage.getItem("agro_user_name");
    const savedAvatar = localStorage.getItem("agro_avatar");
    if (token) {
      setIsLoggedIn(true);
      if (name) setProfile(prev => ({ ...prev, name }));
      if (savedAvatar) setAvatar(savedAvatar);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("agro_token");
    localStorage.removeItem("agro_user_name");
    localStorage.removeItem("agro_avatar");
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
        alert("Аватар успешно обновлен!");
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAvatarUpload = () => {
    document.getElementById("avatar-input")?.click();
  };

  const handleNotImplemented = (feature: string) => {
    alert(`Раздел "${feature}" находится в разработке и будет доступен в ближайшем обновлении!`);
  };

  if (!isLoggedIn) {
    return (
      <div className="absolute inset-0 z-50 bg-[#EAF3E7] flex flex-col items-center justify-center p-8 text-center h-full">
        <div className="h-24 w-24 bg-white rounded-[2.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-green-900/10 scale-110">
          <User className="size-12 text-[#2F6B3D] opacity-20" />
        </div>
        <h2 className="text-3xl font-black text-[#2F6B3D] mb-3 tracking-tighter">Необходим вход</h2>
        <p className="text-[#2F6B3D]/60 text-sm mb-10 px-6 font-medium leading-relaxed">
          Авторизуйтесь, чтобы управлять своим профилем, следить за территорией и сделками.
        </p>
        <Button 
          onClick={() => window.location.reload()}
          className="w-full h-16 rounded-[1.5rem] bg-[#2F6B3D] text-white font-black text-lg shadow-xl shadow-green-900/40 active:scale-95 transition-all"
        >
          Войти в AgriPlan
        </Button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 bg-[#EAF3E7] pt-8 px-6 pb-32 overflow-y-auto w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 pointer-events-auto">
      <div className="flex justify-between items-center mb-10 mt-2">
        <h1 className="text-4xl font-black text-[#2F6B3D] tracking-tighter">Профиль</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleNotImplemented("Настройки")}
          className="text-[#2F6B3D] hover:bg-white/60 bg-white/30 backdrop-blur-md rounded-2xl h-12 w-12 shadow-sm cursor-pointer active:scale-90 transition-all"
        >
          <Settings className="size-6" />
        </Button>
      </div>

      <div className="flex items-center gap-6 mb-12">
        <div 
          onClick={triggerAvatarUpload}
          className="h-28 w-28 rounded-[2.5rem] bg-white flex items-center justify-center p-1 relative border-none shadow-2xl shadow-green-900/15 cursor-pointer hover:scale-105 active:scale-95 transition-all group overflow-hidden"
        >
          {avatar ? (
            <img src={avatar} alt="Avatar" className="w-full h-full object-cover rounded-[2.3rem]" />
          ) : (
            <div className="flex flex-col items-center justify-center text-[#2F6B3D]/40">
              <User className="size-12 mb-1" />
              <span className="text-[10px] font-black uppercase opacity-60">Загрузить</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase">
            Изменить
          </div>
          <input 
            id="avatar-input" 
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handleAvatarChange} 
          />
        </div>
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-[#2F6B3D] leading-none tracking-tight">{profile.name}</h2>
          <p className="text-[#2F6B3D]/40 text-sm font-bold">{profile.phone}</p>
          <div className="inline-flex items-center gap-2 mt-3 bg-[#2F6B3D] text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-lg shadow-green-900/20">
            <ShieldCheck className="size-3.5" />
            {profile.role}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Card 
          onClick={() => handleNotImplemented("Мои территории")}
          className="border-none shadow-xl shadow-green-900/5 rounded-[2rem] bg-white/80 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer overflow-hidden group"
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-blue-50/50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <MapIcon className="size-6" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-[#2F6B3D] text-lg leading-tight uppercase tracking-tight">Мои участки</span>
                <span className="text-[10px] font-bold text-[#2F6B3D]/40 uppercase">1 активная территория</span>
              </div>
            </div>
            <ChevronRight className="size-6 text-[#2F6B3D]/20 group-hover:text-[#2F6B3D] transition-colors" />
          </CardContent>
        </Card>
        
        <Card 
          onClick={() => handleNotImplemented("История сделок")}
          className="border-none shadow-xl shadow-green-900/5 rounded-[2rem] bg-white/80 backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer overflow-hidden group"
        >
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-[#C6A85E]/10 text-[#C6A85E] rounded-2xl group-hover:bg-[#C6A85E] group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-[#2F6B3D] text-lg leading-tight uppercase tracking-tight">История сделок</span>
                <span className="text-[10px] font-bold text-[#2F6B3D]/40 uppercase text-amber-600/60">5 завершенных операций</span>
              </div>
            </div>
            <ChevronRight className="size-6 text-[#2F6B3D]/20 group-hover:text-[#2F6B3D] transition-colors" />
          </CardContent>
        </Card>
      </div>

      <div className="mt-14 pb-10">
        <Button 
          onClick={handleLogout}
          variant="outline" 
          className="w-full h-18 rounded-[1.5rem] border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 hover:border-red-500 flex items-center gap-4 font-black text-base uppercase tracking-widest cursor-pointer active:scale-95 transition-all shadow-lg shadow-red-500/5"
        >
          <LogOut className="size-5 stroke-[3px]" />
          Выйти
        </Button>
      </div>
    </div>
  );
}
