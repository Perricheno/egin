"use client";

import { useState } from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateListingModal({ isOpen, onClose, onSuccess }: CreateListingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: "Овощи",
    cropId: "Картофель",
    quantity: "",
    unit: "кг",
    price: "",
    currency: "KZT",
    location: "Алматинская обл.",
    availableFrom: new Date().toISOString().split("T")[0],
    description: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const token = localStorage.getItem("agro_token");
      if (!token) {
        alert("Пожалуйста, войдите в систему");
        return;
      }

      const res = await fetch("http://localhost:3000/marketplace/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
        })
      });

      const json = await res.json();
      
      if (res.ok && json) {
        onSuccess();
        onClose();
      } else {
        alert("Ошибка при создании объявления: " + (json.message || res.statusText));
      }
    } catch (e) {
      alert("Не удалось отправить данные.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#EAF3E7] w-full sm:w-[32rem] max-h-[90vh] sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-10 duration-300">
        
        <div className="px-6 py-4 flex justify-between items-center bg-white/60 backdrop-blur-md border-b border-white/40 sticky top-0 z-10">
          <h2 className="text-xl font-black text-[#2F6B3D]">Новое объявление</h2>
          <button onClick={onClose} className="p-2 rounded-full bg-white text-muted-foreground hover:text-black shadow-sm transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="create-listing-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#2F6B3D] ml-2 opacity-70 uppercase tracking-wider">Название</label>
              <input 
                name="title" required value={formData.title} onChange={handleChange}
                className="w-full h-14 bg-white rounded-2xl px-4 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-shadow text-sm font-medium" 
                placeholder="Например: Отборный картофель" 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2F6B3D] ml-2 opacity-70 uppercase tracking-wider">Категория</label>
                <select 
                  name="category" required value={formData.category} onChange={handleChange}
                  className="w-full h-14 bg-white rounded-2xl px-4 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-shadow text-sm font-medium"
                >
                  <option value="Овощи">Овощи</option>
                  <option value="Фрукты">Фрукты</option>
                  <option value="Зерновые">Зерновые</option>
                  <option value="Прочее">Прочее</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2F6B3D] ml-2 opacity-70 uppercase tracking-wider">Культура (Тег)</label>
                <input 
                  name="cropId" required value={formData.cropId} onChange={handleChange}
                  className="w-full h-14 bg-white rounded-2xl px-4 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-shadow text-sm font-medium" 
                  placeholder="Картофель" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2F6B3D] ml-2 opacity-70 uppercase tracking-wider">Объем</label>
                <div className="flex gap-2">
                  <input 
                    name="quantity" type="number" required min="1" value={formData.quantity} onChange={handleChange}
                    className="w-full h-14 bg-white rounded-2xl px-4 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-shadow text-sm font-medium" 
                    placeholder="100" 
                  />
                  <select 
                    name="unit" value={formData.unit} onChange={handleChange}
                    className="w-24 h-14 bg-white rounded-2xl px-2 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 text-sm font-medium"
                  >
                    <option value="т">тонн</option>
                    <option value="кг">кг</option>
                    <option value="шт">шт</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#2F6B3D] ml-2 opacity-70 uppercase tracking-wider">Цена за ед.</label>
                <input 
                  name="price" type="number" required min="1" value={formData.price} onChange={handleChange}
                  className="w-full h-14 bg-white rounded-2xl px-4 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-shadow text-sm font-medium" 
                  placeholder="25000" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#2F6B3D] ml-2 opacity-70 uppercase tracking-wider">Регион / Локация</label>
              <input 
                name="location" required value={formData.location} onChange={handleChange}
                className="w-full h-14 bg-white rounded-2xl px-4 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-shadow text-sm font-medium" 
                placeholder="Алматинская обл, Талгар" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#2F6B3D] ml-2 opacity-70 uppercase tracking-wider">Доступно с</label>
              <input 
                name="availableFrom" type="date" required value={formData.availableFrom} onChange={handleChange}
                className="w-full h-14 bg-white rounded-2xl px-4 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-shadow text-sm font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-[#2F6B3D] ml-2 opacity-70 uppercase tracking-wider">Описание</label>
              <textarea 
                name="description" rows={3} value={formData.description} onChange={handleChange}
                className="w-full bg-white rounded-2xl p-4 shadow-sm border-none focus:outline-none focus:ring-2 focus:ring-[#2F6B3D]/30 transition-shadow text-sm font-medium resize-none" 
                placeholder="Дополнительные детали..." 
              />
            </div>

          </form>
        </div>

        <div className="p-6 bg-white/40 backdrop-blur-md border-t border-white/60 sticky bottom-0">
          <Button 
            type="submit" 
            form="create-listing-form"
            disabled={isSubmitting}
            className="w-full h-14 rounded-2xl bg-[#2F6B3D] text-white font-black text-lg shadow-xl shadow-green-900/30 hover:scale-[1.02] transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <span className="animate-pulse">Отправка...</span>
            ) : (
              <>
                <Check className="size-6" /> Опубликовать
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
}
