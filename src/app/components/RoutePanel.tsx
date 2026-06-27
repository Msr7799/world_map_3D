"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RouteResult } from "@/types";

// ============================================================
// أيقونات الاتجاهات
// ============================================================
function DirectionIcon({ instruction }: { instruction: string }) {
  const lower = instruction.toLowerCase();
  if (lower.includes("يسار") || lower.includes("left")) {
    return (
      <svg className="w-4 h-4 text-sky-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
      </svg>
    );
  }
  if (lower.includes("يمين") || lower.includes("right")) {
    return (
      <svg className="w-4 h-4 text-sky-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    );
  }
  if (lower.includes("استدر") || lower.includes("u-turn") || lower.includes("انعطف")) {
    return (
      <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    );
  }
  if (lower.includes("وصل") || lower.includes("destination") || lower.includes("وجهتك")) {
    return (
      <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  // مباشر / استمر
  return (
    <svg className="w-4 h-4 text-sky-400/60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

// ============================================================
// مكوّن RoutePanel
// ============================================================
interface RoutePanelProps {
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  onClose: () => void;
  /** دالة لحساب المسار - تُستدعى من الخارج حيث google.maps متاح */
  onRequestRoute: (
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: "DRIVING" | "WALKING"
  ) => Promise<RouteResult | null>;
}

export default function RoutePanel({
  destinationName,
  destinationLat,
  destinationLng,
  onClose,
  onRequestRoute,
}: RoutePanelProps) {
  const [travelMode, setTravelMode] = useState<"DRIVING" | "WALKING">("DRIVING");
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [showSteps, setShowSteps] = useState(false);

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

  // حساب المسار
  const handleCalculate = useCallback(async () => {
    if (!userLocation) return;
    setIsLoading(true);
    setError(null);
    setRouteResult(null);

    try {
      const result = await onRequestRoute(
        userLocation,
        { lat: destinationLat, lng: destinationLng },
        travelMode
      );

      if (!result) {
        setError("تعذر حساب المسار. تأكد من تفعيل Directions API");
      } else {
        setRouteResult(result);
      }
    } catch (e) {
      setError("حدث خطأ أثناء حساب المسار");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation, destinationLat, destinationLng, travelMode, onRequestRoute]);

  // إعادة الحساب عند تغيير وضع التنقل (إن كان لدينا نتيجة)
  useEffect(() => {
    if (routeResult && userLocation) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [travelMode]);

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
                <p className="text-white font-bold text-sm">حساب المسار</p>
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

            {/* ── زر الحساب ── */}
            <button
              onClick={handleCalculate}
              disabled={locStatus !== "ready" || isLoading}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                boxShadow: "0 4px 20px rgba(14,165,233,0.35)",
              }}
            >
              {isLoading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8" />
                  </svg>
                  جاري الحساب...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  احسب المسار
                </>
              )}
            </button>

            {/* ── رسالة الخطأ ── */}
            <AnimatePresence>
              {error && !isLoading && locStatus === "ready" && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl p-3 text-xs text-red-300"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
                >
                  ❌ {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── نتيجة المسار ── */}
            <AnimatePresence>
              {routeResult && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  {/* ملخص */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: "linear-gradient(135deg, rgba(14,165,233,0.12), rgba(99,102,241,0.12))",
                      border: "1px solid rgba(56,189,248,0.2)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-sky-300/60 text-xs mb-1">المسافة</p>
                        <p className="text-white font-bold text-lg">{routeResult.distance}</p>
                      </div>
                      <div
                        className="w-px h-10 self-center"
                        style={{ background: "rgba(56,189,248,0.2)" }}
                      />
                      <div className="text-center">
                        <p className="text-sky-300/60 text-xs mb-1">الوقت التقريبي</p>
                        <p className="text-white font-bold text-lg">{routeResult.duration}</p>
                      </div>
                      <div
                        className="w-px h-10 self-center"
                        style={{ background: "rgba(56,189,248,0.2)" }}
                      />
                      <div className="text-center">
                        <p className="text-sky-300/60 text-xs mb-1">وضع التنقل</p>
                        <p className="text-2xl">
                          {routeResult.travelMode === "DRIVING" ? "🚗" : "🚶"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* خطوات المسار */}
                  {routeResult.steps.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowSteps((v) => !v)}
                        className="flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5"
                        style={{ border: "1px solid rgba(56,189,248,0.12)" }}
                      >
                        <span className="text-sky-300/70 font-medium">
                          التفاصيل ({routeResult.steps.length} خطوة)
                        </span>
                        <svg
                          className={`w-4 h-4 text-sky-400/50 transition-transform duration-200 ${showSteps ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {showSteps && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.22 }}
                            className="overflow-hidden"
                          >
                            <div
                              className="mt-2 rounded-xl overflow-hidden divide-y"
                              style={{
                                border: "1px solid rgba(56,189,248,0.1)",
                                background: "rgba(14,22,40,0.6)",
                              }}
                            >
                              {routeResult.steps.map((step, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-3 px-3 py-2.5"
                                  style={{ borderBottom: i < routeResult.steps.length - 1 ? "1px solid rgba(56,189,248,0.08)" : "none" }}
                                >
                                  <div className="mt-0.5">
                                    <DirectionIcon instruction={step.instructions} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white/80 text-xs leading-relaxed">
                                      {step.instructions}
                                    </p>
                                    <div className="flex gap-3 mt-1">
                                      {step.distance && (
                                        <span className="text-sky-400/50 text-xs font-mono">
                                          {step.distance}
                                        </span>
                                      )}
                                      {step.duration && (
                                        <span className="text-sky-400/50 text-xs font-mono">
                                          {step.duration}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
