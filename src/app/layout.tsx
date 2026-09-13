import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://world-map-3-d.vercel.app"),
  title: {
    default: "Earth3D Explorer | استكشف الكرة الأرضية ثلاثية الأبعاد",
    template: "%s | Earth3D Explorer",
  },
  description:
    "استكشف الكرة الأرضية ثلاثية الأبعاد وتعرّف على المدن والمعالم عبر خريطة تفاعلية، وابحث بالإحداثيات وشاهد النظام الشمسي والكواكب مباشرة من المتصفح.",
  keywords: [
    "كرة أرضية ثلاثية الأبعاد",
    "خريطة العالم تفاعلية",
    "استكشاف الأرض",
    "خريطة 3D",
    "النظام الشمسي",
    "البحث عن الأماكن",
    "خرائط Google",
    "Three.js",
  ],
  authors: [{ name: "Earth3D Explorer" }],
  creator: "Earth3D Explorer",
  publisher: "Earth3D Explorer",
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "tedQd55zrvYnRtg8uOcxm7sTuI3AZhKVSyQU-2Gq9pg",
  },
  openGraph: {
    type: "website",
    locale: "ar_AR",
    url: "https://world-map-3-d.vercel.app/",
    siteName: "Earth3D Explorer",
    title: "Earth3D Explorer | استكشف الكرة الأرضية ثلاثية الأبعاد",
    description:
      "أداة تفاعلية لاستكشاف الأرض والمدن والمعالم والكواكب باستخدام عرض ثلاثي الأبعاد.",
    images: [
      {
        url: "/earth3d.png",
        width: 1200,
        height: 630,
        alt: "الكرة الأرضية ثلاثية الأبعاد في Earth3D Explorer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Earth3D Explorer | استكشف الكرة الأرضية ثلاثية الأبعاد",
    description:
      "استكشف الأرض والمدن والمعالم والنظام الشمسي في تجربة ثلاثية الأبعاد تفاعلية.",
    images: ["/earth3d.png"],
  },
  category: "education",
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Earth3D Explorer",
  alternateName: "مستكشف الأرض ثلاثي الأبعاد",
  url: "https://world-map-3-d.vercel.app/",
  description: metadata.description,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript and WebGL",
  inLanguage: "ar",
  image: "https://world-map-3-d.vercel.app/earth3d.png",
  featureList: [
    "استكشاف الكرة الأرضية ثلاثية الأبعاد",
    "البحث عن المدن والمعالم والأماكن",
    "البحث بالإحداثيات وتحديد الموقع الحالي",
    "عرض النظام الشمسي والكواكب",
  ],
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
        <meta name="theme-color" content="#020408" />
        <link rel="icon" href="/planet-earth.png" />
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="overflow-hidden bg-space-950 antialiased">
        {children}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2259594031936212"
          crossOrigin="anonymous"
        />
      </body>
    </html>
  );
}
