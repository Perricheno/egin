"use client";

import { useState } from "react";
import { Check, Sprout, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";
import { PlatformLanguage } from "@/lib/i18n";

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language: PlatformLanguage;
}

export default function CreateListingModal({
  isOpen,
  onClose,
  onSuccess,
  language,
}: CreateListingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    category: language === "kk" ? "Көкөніс" : "Овощи",
    cropId: language === "kk" ? "Картоп" : "Картофель",
    quantity: "",
    unit: "кг",
    price: "",
    currency: "KZT",
    location: language === "kk" ? "Алматы обл." : "Алматинская обл.",
    availableFrom: new Date().toISOString().split("T")[0],
    description: "",
  });
  const copy =
    language === "kk"
      ? {
          needLogin: "Жүйеге кіріңіз",
          hidden:
            "Жарияланым жасалды, бірақ бәсеке төмен болғандықтан жалпы маркеттен жасырылды.",
          visible: "Жарияланым жасалды және маркетте көрініп тұр.",
          errorCreate: "Жарияланым жасау қатесі: ",
          errorSend: "Деректерді жіберу мүмкін болмады.",
          eyebrow: "Жаңа жарияланым",
          title: "Өнімді жариялау",
          smart: "Ақылды көріну",
          smartText:
            "Жарияланым жасалғаннан кейін жүйе бәсекені бағалайды. Егер бәсеке төмен болса, позицияны маркеттен жасыра алады.",
          fieldTitle: "Атауы",
          category: "Санат",
          crop: "Дақыл",
          quantity: "Көлем",
          price: "Баға",
          location: "Орналасу",
          available: "Қай күннен",
          description: "Сипаттама",
          publishing: "Жариялануда...",
          publish: "Жариялау",
          vegetables: "Көкөніс",
          fruits: "Жеміс",
          grains: "Дәнді",
          other: "Басқа",
          titlePlaceholder: "Мысалы: Іріктелген картоп",
          locationPlaceholder: "Алматы обл, Талғар",
          descriptionPlaceholder: "Сапа, сақтау және жеткізу туралы қосымша мәлімет...",
        }
      : {
          needLogin: "Пожалуйста, войдите в систему",
          hidden:
            "Объявление создано, но скрыто из общего маркетплейса из-за низкой конкуренции.",
          visible: "Объявление создано и доступно в общем маркетплейсе.",
          errorCreate: "Ошибка при создании объявления: ",
          errorSend: "Не удалось отправить данные.",
          eyebrow: "Новое объявление",
          title: "Публикация из хозяйства",
          smart: "Умная видимость",
          smartText:
            "После публикации система оценивает конкуренцию. Если конкуренция низкая, позиция может быть скрыта из общего маркета.",
          fieldTitle: "Название",
          category: "Категория",
          crop: "Культура",
          quantity: "Объем",
          price: "Цена",
          location: "Локация",
          available: "Доступно с",
          description: "Описание",
          publishing: "Публикуем...",
          publish: "Опубликовать",
          vegetables: "Овощи",
          fruits: "Фрукты",
          grains: "Зерновые",
          other: "Прочее",
          titlePlaceholder: "Например: Отборный картофель",
          locationPlaceholder: "Алматинская обл, Талгар",
          descriptionPlaceholder: "Дополнительные детали по качеству, хранению и логистике...",
        };

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("agro_token");
      if (!token) {
        alert(copy.needLogin);
        return;
      }

      const res = await fetch(apiUrl("/marketplace/listings"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          quantity: Number(formData.quantity),
          price: Number(formData.price),
        }),
      });

      const json = await res.json();

      if (res.ok && json) {
        const visibilityStatus = json.visibilityStatus as string | undefined;
        const visibilityReason = json.visibilityReason as string | undefined;

        if (visibilityStatus === "hidden") {
          alert(visibilityReason || copy.hidden);
        } else if (visibilityStatus === "visible") {
          alert(visibilityReason || copy.visible);
        }

        onSuccess();
        onClose();
      } else {
        alert(copy.errorCreate + (json.message || res.statusText));
      }
    } catch {
      alert(copy.errorSend);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 backdrop-blur-sm sm:items-center">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-[#F4EFE6] shadow-[0_30px_100px_rgba(13,30,17,0.3)] animate-in slide-in-from-bottom-8 duration-300">
        <div className="flex items-center justify-between border-b border-white/45 bg-white/55 px-6 py-5 backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#2F6B3D]/45">
              {copy.eyebrow}
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#17381C]">
              {copy.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex size-11 items-center justify-center rounded-full bg-white text-[#17381C] shadow-sm transition-colors hover:bg-[#efe7d6]"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6">
          <div className="mb-5 rounded-[1.8rem] bg-[#17381C] px-5 py-4 text-white">
            <div className="mb-2 flex items-center gap-2">
              <Sprout className="size-4 text-[#D9B44A]" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-white/62">
                {copy.smart}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/78">
              {copy.smartText}
            </p>
          </div>

          <form id="create-listing-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                {copy.fieldTitle}
              </label>
              <input
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="h-14 w-full rounded-[1.4rem] border-none bg-white px-4 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
                placeholder={copy.titlePlaceholder}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                  {copy.category}
                </label>
                <select
                  name="category"
                  required
                  value={formData.category}
                  onChange={handleChange}
                  className="h-14 w-full rounded-[1.4rem] border-none bg-white px-4 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
                >
                  <option value={copy.vegetables}>{copy.vegetables}</option>
                  <option value={copy.fruits}>{copy.fruits}</option>
                  <option value={copy.grains}>{copy.grains}</option>
                  <option value={copy.other}>{copy.other}</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                  {copy.crop}
                </label>
                <input
                  name="cropId"
                  required
                  value={formData.cropId}
                  onChange={handleChange}
                  className="h-14 w-full rounded-[1.4rem] border-none bg-white px-4 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
                  placeholder="Картофель"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                  {copy.quantity}
                </label>
                <div className="flex gap-2">
                  <input
                    name="quantity"
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="h-14 w-full rounded-[1.4rem] border-none bg-white px-4 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
                    placeholder="100"
                  />
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="h-14 w-28 rounded-[1.4rem] border-none bg-white px-3 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
                  >
                    <option value="т">тонн</option>
                    <option value="кг">кг</option>
                    <option value="шт">шт</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                  {copy.price}
                </label>
                <input
                  name="price"
                  type="number"
                  required
                  min="1"
                  value={formData.price}
                  onChange={handleChange}
                  className="h-14 w-full rounded-[1.4rem] border-none bg-white px-4 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
                  placeholder="25000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                {copy.location}
              </label>
              <input
                name="location"
                required
                value={formData.location}
                onChange={handleChange}
                className="h-14 w-full rounded-[1.4rem] border-none bg-white px-4 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
                placeholder={copy.locationPlaceholder}
              />
            </div>

            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                {copy.available}
              </label>
              <input
                name="availableFrom"
                type="date"
                required
                value={formData.availableFrom}
                onChange={handleChange}
                className="h-14 w-full rounded-[1.4rem] border-none bg-white px-4 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="ml-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B3D]/45">
                {copy.description}
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                className="w-full resize-none rounded-[1.4rem] border-none bg-white p-4 text-sm font-semibold text-[#17381C] shadow-sm outline-none"
                placeholder={copy.descriptionPlaceholder}
              />
            </div>
          </form>
        </div>

        <div className="border-t border-white/50 bg-white/55 px-6 py-5 backdrop-blur-xl">
          <Button
            type="submit"
            form="create-listing-form"
            disabled={isSubmitting}
            className="h-14 w-full rounded-[1.4rem] bg-[#17381C] text-lg font-black text-white shadow-xl hover:bg-[#214a28]"
          >
            {isSubmitting ? (
              copy.publishing
            ) : (
              <>
                <Check className="mr-2 size-5" />
                {copy.publish}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
