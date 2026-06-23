"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEarthStore } from "@/lib/store";

export default function MarkerInfo() {
  const { selectedMarker, selectMarker, removeMarker, flyTo } = useEarthStore();

  return (
    <AnimatePresence>
      {selectedMarker && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20"
          style={{ width: "min(420px, 90vw)" }}
        >
          <div
            className="relative overflow-hidden rounded-2xl p-5"
            style={{
              background: "rgba(6,13,26,0.92)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(56,189,248,0.25)",
              boxShadow:
                "0 32px 80px rgba(0,0,0,0.6), 0 0 40px rgba(56,189,248,0.08)",
            }}
          >
            {/* خلفية الضوء */}
            <div
              className="absolute top-0 left-0 right-0 h-24 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse at 50% -20%, ${selectedMarker.color || "#38bdf8"}20 0%, transparent 70%)`,
              }}
            />

            {/* الرأس */}
            <div className="relative flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                {/* دائرة اللون */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${selectedMarker.color || "#38bdf8"}20`,
                    border: `2px solid ${selectedMarker.color || "#38bdf8"}60`,
                    boxShadow: `0 0 16px ${selectedMarker.color || "#38bdf8"}30`,
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full animate-pulse"
                    style={{
                      background: selectedMarker.color || "#38bdf8",
                      boxShadow: `0 0 8px ${selectedMarker.color || "#38bdf8"}`,
                    }}
                  />
                </div>

                <div style={{ direction: "rtl" }}>
                  <h3 className="text-white font-bold text-base leading-tight">
                    {selectedMarker.name}
                  </h3>
                  {selectedMarker.country && (
                    <p className="text-sky-300/60 text-xs mt-0.5">
                      {selectedMarker.country}
                    </p>
                  )}
                </div>
              </div>

              {/* زر الإغلاق */}
              <button
                onClick={() => selectMarker(null)}
                className="text-white/30 hover:text-white/70 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* الإحداثيات */}
            <div
              className="grid grid-cols-2 gap-3 mb-4"
              style={{ direction: "ltr" }}
            >
              {[
                { label: "خط العرض", value: selectedMarker.lat.toFixed(4) + "°", icon: "↕" },
                { label: "خط الطول", value: selectedMarker.lng.toFixed(4) + "°", icon: "↔" },
              ].map((coord) => (
                <div
                  key={coord.label}
                  className="px-3 py-2 rounded-xl text-center"
                  style={{
                    background: "rgba(56,189,248,0.06)",
                    border: "1px solid rgba(56,189,248,0.12)",
                  }}
                >
                  <div className="text-sky-400/50 text-xs mb-1">{coord.icon} {coord.label}</div>
                  <div className="text-white font-mono text-sm font-bold">
                    {coord.value}
                  </div>
                </div>
              ))}
            </div>

            {/* الأزرار */}
            <div className="flex gap-2" style={{ direction: "rtl" }}>
              <button
                onClick={() => flyTo(selectedMarker.lat, selectedMarker.lng, 1.8)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
                  color: "white",
                  boxShadow: "0 4px 16px rgba(14,165,233,0.3)",
                }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                اذهب إليه
              </button>

              <button
                onClick={() => {
                  removeMarker(selectedMarker.id);
                  selectMarker(null);
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105"
                style={{
                  background: "rgba(239,68,68,0.12)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171",
                }}
              >
                حذف
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
