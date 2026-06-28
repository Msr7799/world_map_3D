"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import SearchPanel from "@/components/SearchPanel";
import ControlPanel from "@/components/ControlPanel";
import MarkerInfo from "@/components/MarkerInfo";
import { useEarthStore } from "@/lib/store";

// تحميل مكوّن Three.js على جانب العميل فقط
const Earth3D = dynamic(() => import("@/components/Earth3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <LoadingScreen />
    </div>
  ),
});

// شاشة التحميل
function LoadingScreen() {
  const ringRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ringRef.current) {
      gsap.to(ringRef.current, {
        rotation: 360,
        duration: 2,
        repeat: -1,
        ease: "none",
      });
    }
    if (textRef.current) {
      gsap.fromTo(
        textRef.current,
        { opacity: 0.3 },
        { opacity: 1, duration: 1, repeat: -1, yoyo: true, ease: "sine.inOut" }
      );
    }
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* حلقة الدوران */}
      <div className="relative w-20 h-20">
        <div
          ref={ringRef}
          className="absolute inset-0 rounded-full"
          style={{
            border: "2px solid transparent",
            borderTopColor: "#38bdf8",
            borderRightColor: "#38bdf840",
          }}
        />
        <div className="absolute inset-3 rounded-full bg-sky-400/10 flex items-center justify-center">
          <span className="text-2xl">🌍</span>
        </div>
      </div>
      <div ref={textRef} className="text-sky-300/70 text-sm font-light">
        جاري تحميل الكرة الأرضية...
      </div>
    </div>
  );
}

// مكوّن الهيدر
function Header() {
  const isMapActive = useEarthStore((state) => state.isMapActive);

  if (isMapActive) return null;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-3 px-4 py-4 sm:px-6 sm:py-5"
    >
      {/* الشعار */}
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #0ea5e9, #0369a1)",
            boxShadow: "0 0 20px rgba(14,165,233,0.4)",
          }}
        >
          <span className="text-base">🌍</span>
        </div>
        <div>
          <h1
            className="text-white font-bold text-sm leading-none sm:text-base"
            style={{ fontFamily: "system-ui, sans-serif", direction: "rtl" }}
          >
            Earth3D Explorer
          </h1>
          <p className="mt-0.5 hidden text-xs text-sky-400/60 min-[420px]:block" style={{ direction: "rtl" }}>
            استكشف كوكبنا بشكل تفاعلي
          </p>
        </div>
      </div>

      {/* Solar System link + حالة الاتصال */}
      <div className="flex items-center gap-1.5">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] sm:px-3 sm:py-1.5 sm:text-xs transition-all hover:scale-105 active:scale-95"
          style={{
            background: "rgba(255,100,0,0.18)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,150,0,0.35)",
            color: "rgba(255,180,80,0.95)",
            direction: "rtl",
            textDecoration: "none",
            fontFamily: "'Cairo', sans-serif",
          }}
        >
          🪐 <span className="hidden min-[380px]:inline">المجموعة الشمسية</span>
          <span className="inline min-[380px]:hidden">المجموعة</span>
        </Link>
        <div
          className="hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs sm:flex"
          style={{
            background: "rgba(6,13,26,0.8)",
            backdropFilter: "blur(12px)",
            border: "1px solid rgba(56,189,248,0.15)",
            color: "rgba(56,189,248,0.7)",
            direction: "rtl",
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          WebGL نشط
        </div>
      </div>
    </motion.header>
  );
}

export default function EarthPage() {
  const isMapActive = useEarthStore((state) => state.isMapActive);
  const isRouteActive = useEarthStore((state) => state.isRouteActive);

  return (
    <main
      className="relative min-h-[100svh] w-screen overflow-hidden"
      style={{ background: "#020408" }}
    >
      {/* خلفية نجوم */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, #0f2040 0%, #060d1a 50%, #020408 100%)",
        }}
      />

      {/* Canvas الكرة الأرضية */}
      <div className="absolute inset-0">
        <Earth3D />
      </div>

      {/* واجهة المستخدم */}
      <div className="relative z-10 min-h-[100svh] w-full pointer-events-none">
        {/* الهيدر */}
        <Header />

        {/* منطقة التحكم (يمين) */}
        {!isMapActive && (
          <div
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-4 z-20 max-h-[34svh] w-[min(14rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain pointer-events-auto sm:top-24 sm:bottom-auto sm:right-6 sm:max-h-[calc(100svh-8rem)] sm:w-auto"
            style={{ direction: "rtl" }}
          >
            <ControlPanel />
          </div>
        )}

        {/* البحث (يسار) */}
        {!isRouteActive && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute inset-x-4 top-20 z-20 pointer-events-auto sm:inset-x-auto sm:left-6 sm:top-24 sm:w-[min(24rem,calc(100vw-3rem))]"
            style={{ direction: "rtl" }}
          >
            <SearchPanel />

            {/* تلميحات */}
            {!isMapActive && (
              <div
                className="mt-3 px-3 py-2 rounded-xl text-right"
                style={{
                  background: "rgba(6,13,26,0.7)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(56,189,248,0.1)",
                }}
              >
                <p className="text-sky-300/40 text-xs" style={{ direction: "rtl" }}>
                  💡 اسحب للدوران · انقر للتكبير
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* معلومات الموقع المختار */}
        {!isMapActive && (
          <div className="absolute inset-x-0 bottom-0 pointer-events-auto">
            <MarkerInfo />
          </div>
        )}
      </div>

      {/* تأثير الضوء المحيطي */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(14,165,233,0.03) 0%, transparent 70%)",
        }}
      />
    </main>
  );
}
