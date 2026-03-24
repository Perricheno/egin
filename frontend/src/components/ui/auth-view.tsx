"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlatformLanguage, ui } from "@/lib/i18n";

interface AuthViewProps {
  onSuccess: (token: string) => void;
  language: PlatformLanguage;
}

export default function AuthView({ onSuccess, language }: AuthViewProps) {
  const t = ui[language];
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
    fullName: "",
    region: "Алматинская",
    district: "Талгар"
  });
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // Phone Normalizer: +7 701... or 8 701... -> +7701...
  const normalizePhone = (raw: string) => {
    let clean = raw.replace(/\D/g, ""); // Only digits
    if (clean.startsWith("8") && clean.length === 11) {
      clean = "7" + clean.substring(1);
    }
    if (!clean.startsWith("7")) {
        // Assume default KZ prefix if omitted or something like 701...
        if (clean.length === 10) clean = "7" + clean;
    }
    return "+" + clean;
  };

  const checkHealth = async () => {
    try {
      const res = await fetch("http://localhost:3000/");
      if (res.ok) setServerStatus("online");
      else setServerStatus("offline");
    } catch {
      setServerStatus("offline");
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password.length < 6) {
        alert(t.passwordShort);
        return;
    }

    setLoading(true);
    const phone = normalizePhone(formData.phone);
    
    let payload: any;
    let endpoint: string;

    if (isLogin) {
      endpoint = "/auth/login";
      payload = { phone, password: formData.password };
    } else {
      endpoint = "/auth/register";
      payload = { 
        phone, 
        password: formData.password,
        fullName: formData.fullName,
        region: formData.region,
        district: formData.district
      };
    }

    console.log("AUTH REQUEST:", { endpoint, payload });

    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      console.log("AUTH RESPONSE:", data);
      
      if (res.ok) {
        const authData = data.data || data;
        if (authData.access_token) {
          onSuccess(authData);
        } else {
          alert(t.noAccessToken);
        }
      } else {
        const msg = Array.isArray(data.message) ? data.message.join("\n") : data.message;
        alert(`ОШИБКА (${res.status}):\n${msg}`);
      }
    } catch (err) {
      alert(t.cannotReachServer);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-br from-[#EAF3E7] via-[#D5E6D0] to-[#EAF3E7] flex items-center justify-center p-6 overflow-y-auto">
      <Card className="w-full max-w-sm border-none shadow-2xl rounded-[2.5rem] bg-white/95 backdrop-blur-sm overflow-hidden p-2 my-auto">
        <CardContent className="pt-8 pb-10 px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-[#2F6B3D] mb-1 tracking-tighter">AgriPlan KZ</h1>
            <div className="flex items-center justify-center gap-2 mb-4">
               <div className={`size-2 rounded-full ${serverStatus === 'online' ? 'bg-green-500 animate-pulse' : serverStatus === 'offline' ? 'bg-red-500' : 'bg-gray-300'}`} />
               <span className="text-[10px] font-bold uppercase opacity-40">
                 {serverStatus === 'online' ? t.serverOnline : serverStatus === 'offline' ? t.serverOffline : t.checking}
               </span>
            </div>
            <p className="text-[#2F6B3D]/60 text-xs font-bold uppercase tracking-widest">
              {isLogin ? t.auth : t.farmerRegistration}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="fullName" className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.fullName}</Label>
                  <Input 
                    id="fullName" 
                    placeholder="Едиль Таласбеков" 
                    className="rounded-2xl h-14 bg-[#F5F9F4] border-none font-bold text-[#2F6B3D]"
                    value={formData.fullName}
                    onChange={e => setFormData({...formData, fullName: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="region" className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.region}</Label>
                    <Input 
                      id="region" 
                      placeholder="Алматинская" 
                      className="rounded-2xl h-14 bg-[#F5F9F4] border-none font-bold text-[#2F6B3D]"
                      value={formData.region}
                      onChange={e => setFormData({...formData, region: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="district" className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.district}</Label>
                    <Input 
                      id="district" 
                      placeholder="Талгар" 
                      className="rounded-2xl h-14 bg-[#F5F9F4] border-none font-bold text-[#2F6B3D]"
                      value={formData.district}
                      onChange={e => setFormData({...formData, district: e.target.value})}
                      required
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label htmlFor="phone" className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.phone}</Label>
              <Input 
                id="phone" 
                placeholder="+7 (702) 600..." 
                className="rounded-2xl h-14 bg-[#F5F9F4] border-none font-bold text-[#2F6B3D]"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password" className="text-[10px] font-black text-[#2F6B3D]/50 ml-2 uppercase">{t.password}</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder={t.passwordShort.replace("Пароль должен быть ", "").replace("!", "")} 
                className="rounded-2xl h-14 bg-[#F5F9F4] border-none font-bold text-[#2F6B3D]"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-15 rounded-2xl bg-[#2F6B3D] hover:bg-[#2F6B3D]/90 text-white font-black text-lg mt-4 shadow-xl active:scale-95 transition-all disabled:opacity-50"
              disabled={loading || serverStatus === 'offline'}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="size-4 border-2 border-white/20 border-t-white animate-spin rounded-full" />
                  <span>{t.wait}</span>
                </div>
              ) : (isLogin ? t.signIn : t.createAccount)}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-black text-[#2F6B3D] hover:underline uppercase tracking-wider opacity-60 hover:opacity-100 transition-opacity"
            >
              {isLogin ? t.noAccount : t.haveAccount}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
