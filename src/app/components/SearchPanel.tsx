"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useEarthStore } from "@/lib/store";
import { searchPlaces, initGoogleMaps } from "@/lib/maps";
import { SearchResult } from "@/types";

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const { flyTo, addMarker, selectMarker } = useEarthStore();

  // تهيئة Google Maps عند التحميل
  useEffect(() => {
    initGoogleMaps().catch(console.error);
  }, []);

  // البحث مع Debounce
  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const found = await searchPlaces(q);
      setResults(found);
    } catch (err) {
      console.error("Search error:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 500);
  };

  // الطيران إلى الموقع المختار
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

  return (
    <div className="relative w-full max-w-sm">
      {/* حقل البحث */}
      <div
        className={`relative flex items-center transition-all duration-300 ${
          isFocused ? "ring-2 ring-sky-400/50" : ""
        }`}
        style={{
          background: "rgba(6,13,26,0.85)",
          backdropFilter: "blur(16px)",
          borderRadius: "12px",
          border: "1px solid rgba(56,189,248,0.25)",
        }}
      >
        {/* أيقونة البحث */}
        <div className="pl-4 text-sky-400">
          {isLoading ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="8" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* مدخل النص */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 150)}
          placeholder="ابحث عن أي مكان في العالم..."
          className="flex-1 bg-transparent px-3 py-3 text-white placeholder-sky-300/40 outline-none text-sm font-sans"
          style={{ direction: "rtl", minWidth: 0 }}
        />

        {/* زر المسح */}
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); }}
            className="pr-3 text-sky-400/60 hover:text-sky-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* نتائج البحث */}
      <AnimatePresence>
        {results.length > 0 && isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full mt-2 w-full overflow-hidden z-50"
            style={{
              background: "rgba(6,13,26,0.95)",
              backdropFilter: "blur(20px)",
              borderRadius: "12px",
              border: "1px solid rgba(56,189,248,0.2)",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {results.map((result, i) => (
              <motion.button
                key={result.placeId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(result)}
                className="w-full flex items-start gap-3 px-4 py-3 hover:bg-sky-400/10 transition-colors text-right group"
                style={{ direction: "rtl" }}
              >
                {/* أيقونة الموقع */}
                <div className="mt-0.5 text-sky-400/60 group-hover:text-sky-400 transition-colors flex-shrink-0">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>

                {/* النص */}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {result.name}
                  </p>
                  <p className="text-sky-300/50 text-xs truncate mt-0.5">
                    {result.formattedAddress}
                  </p>
                </div>

                {/* إحداثيات */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sky-400/40 text-xs font-mono">
                    {result.location.lat.toFixed(2)}°
                  </p>
                  <p className="text-sky-400/40 text-xs font-mono">
                    {result.location.lng.toFixed(2)}°
                  </p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
