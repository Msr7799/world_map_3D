"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEarthStore } from "@/lib/store";
import { searchPlaces, geocodeAddress, initGoogleMaps } from "@/lib/maps";
import { SearchResult } from "@/types";

type TabType = "search" | "coords" | "location";

export default function SearchPanel() {
  const [activeTab, setActiveTab] = useState<TabType>("search");

  // --- Search Tab ---
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // --- Coords Tab ---
  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [coordError, setCoordError] = useState("");

  // --- Location Tab ---
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [locMessage, setLocMessage] = useState("");
  const [locAddress, setLocAddress] = useState("");

  const { flyTo, addMarker, selectMarker } = useEarthStore();

  useEffect(() => {
    initGoogleMaps().catch(console.error);
  }, []);

  // ====================================================
  // TAB: البحث بالاسم
  // ====================================================
  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setIsLoading(true);
    try {
      const found = await searchPlaces(q);
      setResults(found);
    } catch { setResults([]); }
    finally { setIsLoading(false); }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 500);
  };

  const handleSelect = (result: SearchResult) => {
    const marker = {
      id: result.placeId,
      lat: result.location.lat,
      lng: result.location.lng,
      name: result.name,
      country: result.formattedAddress,
      type: "searched" as const,
      color: "#f59e0b",
      size: 1.3,
    };
    addMarker(marker);
    selectMarker(marker);
    flyTo(result.location.lat, result.location.lng, 2.2);
    setQuery(result.name);
    setResults([]);
    setIsFocused(false);
  };

  // ====================================================
  // TAB: البحث بالإحداثيات
  // ====================================================
  const handleCoordsSearch = async () => {
    const lat = parseFloat(latInput);
    const lng = parseFloat(lngInput);

    if (isNaN(lat) || isNaN(lng)) {
      setCoordError("الرجاء إدخال أرقام صحيحة للإحداثيات");
      return;
    }
    if (lat < -90 || lat > 90) {
      setCoordError("خط العرض يجب أن يكون بين -90 و 90");
      return;
    }
    if (lng < -180 || lng > 180) {
      setCoordError("خط الطول يجب أن يكون بين -180 و 180");
      return;
    }

    setCoordError("");
    setIsLoading(true);

    // محاولة الحصول على اسم المكان
    let name = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const geo = await geocodeAddress(`${lat},${lng}`);
      if (geo?.name) name = geo.name;
    } catch { /* استخدام الإحداثيات مباشرة */ }

    const marker = {
      id: `coord-${lat}-${lng}`,
      lat,
      lng,
      name,
      country: `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`,
      type: "custom" as const,
      color: "#a78bfa",
      size: 1.3,
    };
    addMarker(marker);
    selectMarker(marker);
    flyTo(lat, lng, 2.2);
    setIsLoading(false);
  };

  // ====================================================
  // TAB: موقعي الحالي
  // ====================================================
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocStatus("error");
      setLocMessage("المتصفح لا يدعم خدمة تحديد الموقع");
      return;
    }

    setLocStatus("loading");
    setLocMessage("جاري تحديد موقعك...");
    setLocAddress("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        // عكس الترميز للحصول على العنوان
        let addressStr = `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
        try {
          const geo = await geocodeAddress(`${lat},${lng}`);
          if (geo?.name) addressStr = geo.name;
        } catch { /* استخدام الإحداثيات */ }

        setLocAddress(addressStr);
        setLocStatus("found");
        setLocMessage("تم تحديد موقعك بنجاح!");

        const marker = {
          id: "my-location",
          lat,
          lng,
          name: "موقعي الحالي",
          country: addressStr,
          type: "custom" as const,
          color: "#34d399",
          size: 1.5,
        };
        addMarker(marker);
        selectMarker(marker);
        flyTo(lat, lng, 2.0);
      },
      (err) => {
        setLocStatus("error");
        switch (err.code) {
          case 1: setLocMessage("رُفض الإذن. يرجى السماح بالوصول للموقع في المتصفح"); break;
          case 2: setLocMessage("تعذر تحديد الموقع. تحقق من اتصالك"); break;
          case 3: setLocMessage("انتهت مهلة تحديد الموقع. حاول مرة أخرى"); break;
          default: setLocMessage("حدث خطأ غير متوقع");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // ====================================================
  // الواجهة
  // ====================================================
  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: "search",   label: "بحث",      icon: "🔍" },
    { id: "coords",   label: "إحداثيات", icon: "📍" },
    { id: "location", label: "موقعي",    icon: "🛰️" },
  ];

  return (
    <div className="relative w-full max-w-sm">
      <div
        style={{
          background: "rgba(6,13,26,0.88)",
          backdropFilter: "blur(20px)",
          borderRadius: "16px",
          border: "1px solid rgba(56,189,248,0.22)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* تبويبات */}
        <div
          className="flex"
          style={{ borderBottom: "1px solid rgba(56,189,248,0.12)" }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2.5 text-xs font-semibold transition-all duration-200"
              style={{
                direction: "rtl",
                color: activeTab === tab.id ? "#38bdf8" : "rgba(148,163,184,0.6)",
                background: activeTab === tab.id ? "rgba(56,189,248,0.08)" : "transparent",
                borderBottom: activeTab === tab.id ? "2px solid #38bdf8" : "2px solid transparent",
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="p-3">
          {/* ── تبويب البحث ── */}
          {activeTab === "search" && (
            <div className="relative">
              <div
                className={`flex items-center transition-all duration-200 ${isFocused ? "ring-1 ring-sky-400/40" : ""}`}
                style={{ background: "rgba(14,22,40,0.8)", borderRadius: "10px", border: "1px solid rgba(56,189,248,0.2)" }}
              >
                <div className="pl-3 text-sky-400">
                  {isLoading
                    ? <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  }
                </div>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setTimeout(() => setIsFocused(false), 150)}
                  placeholder="ابحث عن أي مكان في العالم..."
                  className="flex-1 bg-transparent px-3 py-2.5 text-white placeholder-sky-300/40 outline-none text-sm"
                  style={{ direction: "rtl", minWidth: 0 }}
                />
                {query && (
                  <button onClick={() => { setQuery(""); setResults([]); }} className="pr-3 text-sky-400/50 hover:text-sky-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              <AnimatePresence>
                {results.length > 0 && isFocused && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-full mt-2 w-full z-50 overflow-hidden"
                    style={{ background: "rgba(6,13,26,0.97)", backdropFilter: "blur(20px)", borderRadius: "12px", border: "1px solid rgba(56,189,248,0.18)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
                  >
                    {results.map((result, i) => (
                      <motion.button
                        key={result.placeId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        onClick={() => handleSelect(result)}
                        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-sky-400/10 transition-colors text-right group"
                        style={{ direction: "rtl" }}
                      >
                        <div className="mt-0.5 text-sky-400/60 group-hover:text-sky-400 flex-shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{result.name}</p>
                          <p className="text-sky-300/50 text-xs truncate mt-0.5">{result.formattedAddress}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sky-400/40 text-xs font-mono">{result.location.lat.toFixed(2)}°</p>
                          <p className="text-sky-400/40 text-xs font-mono">{result.location.lng.toFixed(2)}°</p>
                        </div>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* ── تبويب الإحداثيات ── */}
          {activeTab === "coords" && (
            <div className="space-y-2.5" style={{ direction: "rtl" }}>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-sky-300/60 mb-1 block">خط العرض (Lat)</label>
                  <input
                    type="number"
                    value={latInput}
                    onChange={(e) => { setLatInput(e.target.value); setCoordError(""); }}
                    placeholder="مثال: 24.7136"
                    step="any"
                    className="w-full bg-transparent text-white text-sm outline-none px-3 py-2.5 placeholder-sky-300/30"
                    style={{ background: "rgba(14,22,40,0.8)", borderRadius: "10px", border: "1px solid rgba(56,189,248,0.2)" }}
                  />
                </div>
                <div>
                  <label className="text-xs text-sky-300/60 mb-1 block">خط الطول (Lng)</label>
                  <input
                    type="number"
                    value={lngInput}
                    onChange={(e) => { setLngInput(e.target.value); setCoordError(""); }}
                    placeholder="مثال: 46.6753"
                    step="any"
                    className="w-full bg-transparent text-white text-sm outline-none px-3 py-2.5 placeholder-sky-300/30"
                    style={{ background: "rgba(14,22,40,0.8)", borderRadius: "10px", border: "1px solid rgba(56,189,248,0.2)" }}
                  />
                </div>
              </div>

              {coordError && (
                <p className="text-red-400 text-xs px-1">{coordError}</p>
              )}

              <button
                onClick={handleCoordsSearch}
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)", boxShadow: "0 4px 20px rgba(124,58,237,0.3)" }}
              >
                {isLoading ? "⏳ جاري البحث..." : "📍 انتقل للموقع ووضع علامة"}
              </button>

              <p className="text-sky-300/30 text-xs text-center">
                أدخل الإحداثيات لوضع علامة مخصصة على الكرة الأرضية
              </p>
            </div>
          )}

          {/* ── تبويب موقعي ── */}
          {activeTab === "location" && (
            <div className="space-y-3" style={{ direction: "rtl" }}>
              <button
                onClick={handleGetLocation}
                disabled={locStatus === "loading"}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #059669, #0d9488)", boxShadow: "0 4px 20px rgba(5,150,105,0.35)" }}
              >
                {locStatus === "loading" ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8" /></svg> جاري التحديد...</>
                ) : (
                  <><span className="text-base">🛰️</span> تحديد موقعي الحالي</>
                )}
              </button>

              <AnimatePresence>
                {locStatus !== "idle" && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl p-3 text-sm"
                    style={{
                      background: locStatus === "found" ? "rgba(5,150,105,0.15)" : locStatus === "error" ? "rgba(239,68,68,0.15)" : "rgba(56,189,248,0.1)",
                      border: `1px solid ${locStatus === "found" ? "rgba(52,211,153,0.3)" : locStatus === "error" ? "rgba(239,68,68,0.3)" : "rgba(56,189,248,0.2)"}`,
                    }}
                  >
                    <p className={`font-semibold text-xs ${locStatus === "found" ? "text-emerald-400" : locStatus === "error" ? "text-red-400" : "text-sky-400"}`}>
                      {locStatus === "found" ? "✅" : locStatus === "error" ? "❌" : "⏳"} {locMessage}
                    </p>
                    {locAddress && (
                      <p className="text-white/70 text-xs mt-1.5 leading-relaxed">{locAddress}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="rounded-xl p-3 text-xs text-sky-300/40 leading-relaxed" style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.1)" }}>
                <p>💡 سيطلب المتصفح إذنك للوصول لموقعك. بعد الموافقة سيتم تحديد موقعك ووضع علامة خضراء على الكرة الأرضية.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
