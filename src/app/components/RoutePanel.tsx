"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================
// مكوّن RoutePanel
// عند طلب المسار: نفتح خرائط Google مباشرة (تطبيق أو ويب) للقيام
// بالملاحة الفعلية من موقع المستخدم الحالي إلى الوجهة، بدل حساب
// المسار داخل التطبيق (كان يعتمد على Directions API وقد يتعطل).
// ============================================================
interface RoutePanelProps {
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  onClose: () => void;
}

export default function RoutePanel({
  destinationName,
  destinationLat,
  destinationLng,
  onClose,
}: RoutePanelProps) {
  const [travelMode, setTravelMode] = useState<"DRIVING" | "WALKING">("DRIVING");
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // الحصول على موقع المستخدم
  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocStatus("error");
      setError("المتصفح لا يدعم خدمة تحديد الموقع");
      return;
    }

    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("ready");
      },
      (err) => {
        setLocStatus("error");
        switch (err.code) {
          case 1: setError("رُفض الإذن. الرجاء السماح بالوصول للموقع"); break;
          case 2: setError("تعذر تحديد الموقع. تحقق من اتصالك"); break;
          case 3: setError("انتهت مهلة التحديد. حاول مرة أخرى"); break;
          default: setError("حدث خطأ في تحديد الموقع");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, []);

  // طلب الموقع تلقائياً عند فتح اللوحة
  useEffect(() => {
    getLocation();
  }, [getLocation]);

  // فتح المسار في خرائط Google (تطبيق الجوال إن وُجد، وإلا نسخة الويب)
  // من موقعي الحالي إلى الوجهة المطلوبة
  const openInGoogleMaps = useCallback(() => {
    const mode = travelMode === "DRIVING" ? "driving" : "walking";
    const destinationParam = `${destinationLat},${destinationLng}`;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&travelmode=${mode}`;
    // إن توفّر موقعي الحالي نحدده كنقطة انطلاق صريحة، وإلا ستستخدم خرائط Google
    // موقع الجهاز الحالي تلقائياً بمجرد فتحها
    if (userLocation) {
      url += `&origin=${userLocation.lat},${userLocation.lng}`;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }, [userLocation, destinationLat, destinationLng, travelMode]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
        className="absolute top-4 left-4 z-30"
        style={{
          width: "min(360px, calc(100vw - 2rem))",
          direction: "rtl",
          maxHeight: "calc(100svh - 2rem)",
          overflowY: "auto",
        }}
      >
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(5, 10, 22, 0.94)",
            backdropFilter: "blur(28px)",
            border: "1px solid rgba(56,189,248,0.22)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          }}
        >
          {/* ── رأس اللوحة ── */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid rgba(56,189,248,0.1)" }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #0ea5e9, #6366f1)" }}
              >
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-bold text-sm">المسار إلى خرائط Google</p>
                <p className="text-white/40 text-xs truncate" style={{ maxWidth: 180 }}>
                  إلى: {destinationName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all"
              aria-label="إغلاق"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* ── نقطة الانطلاق ── */}
            <div
              className="rounded-xl p-3"
              style={{ background: "rgba(14,22,40,0.7)", border: "1px solid rgba(56,189,248,0.12)" }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white/40 text-xs">من</p>
                  {locStatus === "idle" || locStatus === "loading" ? (
                    <p className="text-sky-300/60 text-sm">
                      {locStatus === "loading" ? "⏳ جاري تحديد موقعك..." : "انقر للسماح بالموقع"}
                    </p>
                  ) : locStatus === "error" ? (
                    <button
                      onClick={getLocation}
                      className="text-amber-400 text-xs hover:text-amber-300 transition-colors"
                    >
                      ⚠️ {error} — إعادة المحاولة
                    </button>
                  ) : (
                    <p className="text-white text-sm font-medium">موقعي الحالي (GPS)</p>
                  )}
                </div>
                {locStatus === "error" && (
                  <button
                    onClick={getLocation}
                    className="flex-shrink-0 px-2 py-1 rounded-lg text-xs text-sky-400 hover:bg-sky-400/10 transition-colors border border-sky-400/30"
                  >
                    إعادة
                  </button>
                )}
              </div>
            </div>

            {/* ── وضع التنقل ── */}
            <div
              className="grid grid-cols-2 gap-2"
              style={{ border: "1px solid rgba(56,189,248,0.1)", borderRadius: 12, padding: 4, background: "rgba(14,22,40,0.5)" }}
            >
              {(["DRIVING", "WALKING"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTravelMode(mode)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background:
                      travelMode === mode
                        ? "linear-gradient(135deg, #0ea5e9, #6366f1)"
                        : "transparent",
                    color: travelMode === mode ? "white" : "rgba(148,163,184,0.7)",
                    boxShadow:
                      travelMode === mode
                        ? "0 2px 12px rgba(14,165,233,0.3)"
                        : "none",
                  }}
                >
                  <span className="text-base">{mode === "DRIVING" ? "🚗" : "🚶"}</span>
                  {mode === "DRIVING" ? "سيارة" : "مشياً"}
                </button>
              ))}
            </div>

            {/* ── زر فتح خرائط Google ── */}
            <button
              onClick={openInGoogleMaps}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                boxShadow: "0 4px 20px rgba(14,165,233,0.35)",
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              فتح المسار في خرائط Google
            </button>

            <p className="text-sky-300/30 text-xs text-center leading-relaxed">
              سيتم فتح خرائط Google للملاحة الفعلية من موقعك الحالي إلى الوجهة
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}