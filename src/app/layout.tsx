import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earth3D Explorer | استكشف الكرة الأرضية",
  description:
    "تطبيق تفاعلي لاستكشاف الكرة الأرضية ثلاثية الأبعاد مع إمكانية البحث عن المواقع والتكبير والتحريك",
  keywords: ["كرة أرضية", "3D", "خرائط", "تفاعلي", "Three.js"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="overflow-hidden bg-space-950 antialiased">{children}</body>
    </html>
  );
}
