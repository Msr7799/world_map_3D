"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useEarthStore } from "@/lib/store";

interface ToggleProps {
  label: string;
  value: boolean;
  icon: string;
  onToggle: () => void;
}

function Toggle({ label, value, icon, onToggle }: ToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 group"
      style={{
        background: value ? "rgba(56,189,248,0.15)" : "rgba(255,255,255,0.04)",
        border: `1px solid ${value ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.06)"}`,
      }}
    >
      <div className="flex items-center gap-3">
        <span className="text-base">{icon}</span>
        <span
          className="text-xs font-medium transition-colors"
          style={{ color: value ? "#38bdf8" : "rgba(255,255,255,0.5)" }}
        >
          {label}
        </span>
      </div>
      {/* مؤشر الحالة */}
      <div
        className="w-2 h-2 rounded-full transition-all duration-300"
        style={{
          background: value ? "#38bdf8" : "rgba(255,255,255,0.2)",
          boxShadow: value ? "0 0 8px #38bdf8" : "none",
        }}
      />
    </button>
  );
}

export default function ControlPanel() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsCollapsed(window.innerWidth < 768);
    }
  }, []);

  const {
    isRotating,
    zoom,
    showAtmosphere,
    showClouds,
    showGrid,
    nightMode,
    setRotating,
    setZoom,
    toggleAtmosphere,
    toggleClouds,
    toggleGrid,
    toggleNightMode,
    flyTo,
    markers,
    selectMarker,
  } = useEarthStore();

  const minZoomDistance = 1.3;
  const maxZoomDistance = 7;
  const zoomPercent = ((maxZoomDistance - zoom) / (maxZoomDistance - minZoomDistance)) * 100;

  // مواقع سريعة
  const quickLocations = [
    { name: "مكة", lat: 21.3891, lng: 39.8579, emoji: "🕌" },
    { name: "دبي", lat: 25.2048, lng: 55.2708, emoji: "🏙️" },
    { name: "باريس", lat: 48.8566, lng: 2.3522, emoji: "🗼" },
    { name: "نيويورك", lat: 40.7128, lng: -74.006, emoji: "🗽" },
    { name: "طوكيو", lat: 35.6762, lng: 139.6503, emoji: "⛩️" },
    { name: "القطب الشمالي", lat: 90, lng: 0, emoji: "🧊" },
  ];

  if (isCollapsed) {
    return (
      <div className="flex justify-end w-full">
        <button
          onClick={() => setIsCollapsed(false)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-sky-950/40"
          style={{
            background: "rgba(6,13,26,0.92)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(56,189,248,0.35)",
            color: "#38bdf8",
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            direction: "rtl",
          }}
        >
          <span>⚙️ خيارات التحكم</span>
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="flex flex-col gap-3 w-56"
    >
      {/* عنوان اللوحة */}
      <div className="px-1 flex items-center justify-between">
        <h2 className="text-sky-400 text-xs font-bold uppercase tracking-[0.2em] mb-0.5">
          لوحة التحكم
        </h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="text-sky-400/70 hover:text-sky-300 transition-colors text-xs font-bold px-2"
          title="طي لوحة التحكم"
        >
          ▲ طي
        </button>
      </div>
      <div className="h-px bg-gradient-to-r from-sky-400/30 to-transparent" />

      {/* زووم */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: "rgba(6,13,26,0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(56,189,248,0.15)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sky-300/70 text-xs font-medium">مستوى التكبير</span>
          <span className="text-sky-400 text-xs font-mono">
            {zoomPercent.toFixed(0)}%
          </span>
        </div>

        {/* شريط الزووم */}
        <input
          type="range"
          min={minZoomDistance}
          max={maxZoomDistance}
          step="0.1"
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
          style={{
            direction: "rtl",
            background: `linear-gradient(to right, #38bdf8 0%, #38bdf8 ${zoomPercent}%, rgba(56,189,248,0.2) ${zoomPercent}%, rgba(56,189,248,0.2) 100%)`,
          }}
        />

        {/* أزرار زووم سريع */}
        <div className="flex gap-2 mt-3">
          {["+", "-"].map((op) => (
            <button
              key={op}
              onClick={() => setZoom(op === "+" ? zoom - 0.4 : zoom + 0.4)}
              className="flex-1 py-1.5 rounded-lg text-sky-400 text-sm font-bold transition-colors hover:bg-sky-400/20"
              style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)" }}
            >
              {op}
            </button>
          ))}
        </div>
      </div>

      {/* خيارات العرض */}
      <div
        className="p-4 rounded-xl flex flex-col gap-2"
        style={{
          background: "rgba(6,13,26,0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(56,189,248,0.15)",
        }}
      >
        <span className="text-sky-300/70 text-xs font-medium mb-1">خيارات العرض</span>

        <Toggle label="الدوران التلقائي" value={isRotating} icon="🔄" onToggle={() => setRotating(!isRotating)} />
        <Toggle label="الغلاف الجوي" value={showAtmosphere} icon="🌫️" onToggle={toggleAtmosphere} />
        <Toggle label="السحاب" value={showClouds} icon="☁️" onToggle={toggleClouds} />
        <Toggle label="شبكة الإحداثيات" value={showGrid} icon="🌐" onToggle={toggleGrid} />
        <Toggle label="الوضع الليلي" value={nightMode} icon="🌙" onToggle={toggleNightMode} />
      </div>

      {/* مواقع سريعة */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: "rgba(6,13,26,0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(56,189,248,0.15)",
        }}
      >
        <span className="text-sky-300/70 text-xs font-medium mb-3 block">انتقال سريع</span>
        <div className="grid grid-cols-2 gap-2">
          {quickLocations.map((loc) => (
            <button
              key={loc.name}
              onClick={() => flyTo(loc.lat, loc.lng, 1.55)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 hover:scale-105 text-right"
              style={{
                background: "rgba(56,189,248,0.06)",
                border: "1px solid rgba(56,189,248,0.15)",
              }}
            >
              <span className="text-sm">{loc.emoji}</span>
              <span className="text-white/70 text-xs truncate">{loc.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* إحصاءات */}
      <div
        className="p-4 rounded-xl"
        style={{
          background: "rgba(6,13,26,0.85)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(56,189,248,0.15)",
        }}
      >
        <span className="text-sky-300/70 text-xs font-medium mb-3 block">إحصاءات</span>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "المواقع", value: markers.length, icon: "📍" },
            { label: "مستوى الزووم", value: zoom.toFixed(1) + "x", icon: "🔭" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center py-2 rounded-lg"
              style={{ background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.1)" }}
            >
              <div className="text-sm mb-1">{stat.icon}</div>
              <div className="text-sky-400 text-sm font-bold font-mono">{stat.value}</div>
              <div className="text-white/40 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
