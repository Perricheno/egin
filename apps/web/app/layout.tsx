import type { Metadata, Viewport } from "next";
import "@fontsource/inter/cyrillic-400.css";
import "@fontsource/inter/cyrillic-ext-400.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/cyrillic-500.css";
import "@fontsource/inter/cyrillic-600.css";
import "@fontsource/inter/latin-600.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "EGIN — Земля. Данные. Решения.",
  description:
    "Рабочее пространство фермера. Поля, погода, почва и сообщество Казахстана.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#173f35",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
