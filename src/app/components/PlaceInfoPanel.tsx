"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlaceDetails } from "@/types";

// ============================================================
// مساعدات
// ============================================================
function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill={i < full ? "#fbbf24" : i === full && half ? "url(#half)" : "none"}
          stroke="#fbbf24"
          strokeWidth={1.5}
        >
          {i === full && half && (
            <defs>
              <linearGradient id="half">
                <stop offset="50%" stopColor="#fbbf24" />
                <stop offset="50%" stopColor="transparent" />
              </linearGradient>
            </defs>
          )}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
      ))}
      <span className="text-amber-300 text-xs font-bold ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

function PriceLevel({ level }: { level: number }) {
  return (
    <span className="text-emerald-400 text-xs font-bold">
      {"$".repeat(level)}<span className="opacity-30">{"$".repeat(4 - level)}</span>
    </span>
  );
}

// ============================================================
// المكوّن الرئيسي
// ============================================================
interface PlaceInfoPanelProps {
  details: PlaceDetails | null;
  isLoading: boolean;
  onClose: () => void;
  onNavigate: () => void;
}

export default function PlaceInfoPanel({
  details,
  isLoading,
  onClose,
  onNavigate,
}: PlaceInfoPanelProps) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [imgError, setImgError] = useState<Record<number, boolean>>({});

  // إعادة الصور عند تغيير المكان
  useEffect(() => {
    setPhotoIdx(0);
    setImgError({});
  }, [details?.placeId]);

  const photos = details?.photos ?? [];
  const validPhotos = photos.filter((_, i) => !imgError[i]);

  const getTypeLabel = (types: string[]) => {
    const map: Record<string, string> = {
      restaurant: "🍽️ مطعم",
      cafe: "☕ مقهى",
      mosque: "🕌 مسجد",
      museum: "🏛️ متحف",
      park: "🌳 حديقة",
      hospital: "🏥 مستشفى",
      hotel: "🏨 فندق",
      shopping_mall: "🛍️ مركز تجاري",
      airport: "✈️ مطار",
      school: "🏫 مدرسة",
      university: "🎓 جامعة",
      bank: "🏦 بنك",
      pharmacy: "💊 صيدلية",
      gas_station: "⛽ محطة وقود",
      tourist_attraction: "🗺️ معلم سياحي",
      locality: "🏙️ مدينة",
      country: "🌍 دولة",
    };
    for (const t of types) {
      if (map[t]) return map[t];
    }
    return "📍 موقع";
  };

  return (
    <AnimatePresence>
      {(isLoading || details) && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute bottom-4 left-1/2 z-30 w-full"
          style={{
            maxWidth: "min(420px, calc(100vw - 2rem))",
            transform: "translateX(-50%)",
            direction: "rtl",
          }}
        >
          <div
            className="relative overflow-hidden rounded-2xl"
            style={{
              background: "rgba(5, 10, 22, 0.94)",
              backdropFilter: "blur(28px)",
              border: "1px solid rgba(56,189,248,0.22)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(56,189,248,0.05)",
            }}
          >
            {/* ═══ حالة التحميل ═══ */}
            {isLoading && !details && (
              <div className="flex flex-col items-center justify-center gap-3 py-10">
                <div
                  className="w-10 h-10 rounded-full border-2 border-sky-400/30 border-t-sky-400 animate-spin"
                />
                <p className="text-sky-300/60 text-sm">جاري تحميل معلومات المكان...</p>
              </div>
            )}

            {/* ═══ المحتوى الرئيسي ═══ */}
            {details && (
              <>
                {/* ── صور المكان ── */}
                {validPhotos.length > 0 && (
                  <div className="relative h-44 sm:h-52 overflow-hidden">
                    <img
                      key={photoIdx}
                      src={validPhotos[photoIdx]?.url}
                      alt={details.name}
                      className="w-full h-full object-cover"
                      onError={() =>
                        setImgError((prev) => ({ ...prev, [photoIdx]: true }))
                      }
                    />
                    {/* تدرج الصورة */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(5,10,22,0.85) 100%)",
                      }}
                    />

                    {/* أزرار التنقل بين الصور */}
                    {validPhotos.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setPhotoIdx((i) => (i - 1 + validPhotos.length) % validPhotos.length)
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{
                            background: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                          aria-label="الصورة السابقة"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() =>
                            setPhotoIdx((i) => (i + 1) % validPhotos.length)
                          }
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                          style={{
                            background: "rgba(0,0,0,0.5)",
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                          aria-label="الصورة التالية"
                        >
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        {/* نقاط التنقل */}
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {validPhotos.map((_, i) => (
                            <button
                              key={i}
                              onClick={() => setPhotoIdx(i)}
                              className="rounded-full transition-all"
                              style={{
                                width: i === photoIdx ? 16 : 6,
                                height: 6,
                                background:
                                  i === photoIdx
                                    ? "#38bdf8"
                                    : "rgba(255,255,255,0.4)",
                              }}
                              aria-label={`صورة ${i + 1}`}
                            />
                          ))}
                        </div>
                      </>
                    )}

                    {/* نوع المكان على الصورة */}
                    <div
                      className="absolute top-3 right-3 px-2 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        color: "rgba(255,255,255,0.85)",
                      }}
                    >
                      {getTypeLabel(details.types)}
                    </div>
                  </div>
                )}

                {/* ── تفاصيل المكان ── */}
                <div className="p-4 space-y-3">
                  {/* الاسم + إغلاق */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-white font-bold text-base leading-tight truncate">
                        {details.name}
                      </h2>
                      {/* التقييم والسعر */}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {details.rating !== undefined && (
                          <StarRating rating={details.rating} />
                        )}
                        {details.userRatingsTotal !== undefined && (
                          <span className="text-white/30 text-xs">
                            ({details.userRatingsTotal.toLocaleString("ar")} تقييم)
                          </span>
                        )}
                        {details.priceLevel !== undefined && details.priceLevel > 0 && (
                          <PriceLevel level={details.priceLevel} />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/10 text-white/40 hover:text-white/80"
                      aria-label="إغلاق"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* حالة الفتح */}
                  {details.openNow !== undefined && (
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        background: details.openNow
                          ? "rgba(16,185,129,0.15)"
                          : "rgba(239,68,68,0.15)",
                        border: details.openNow
                          ? "1px solid rgba(16,185,129,0.3)"
                          : "1px solid rgba(239,68,68,0.3)",
                        color: details.openNow ? "#34d399" : "#f87171",
                      }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{
                          background: details.openNow ? "#34d399" : "#f87171",
                        }}
                      />
                      {details.openNow ? "مفتوح الآن" : "مغلق الآن"}
                    </div>
                  )}

                  {/* العنوان */}
                  {details.address && (
                    <div className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 text-sky-400/60 flex-shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <p className="text-white/60 text-xs leading-relaxed">
                        {details.address}
                      </p>
                    </div>
                  )}

                  {/* رقم الهاتف */}
                  {details.phone && (
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-sky-400/60 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <a
                        href={`tel:${details.phone}`}
                        className="text-sky-300 text-xs hover:text-sky-200 transition-colors font-mono"
                        style={{ direction: "ltr" }}
                      >
                        {details.phone}
                      </a>
                    </div>
                  )}

                  {/* ساعات العمل */}
                  {details.openingHours && details.openingHours.length > 0 && (
                    <OpeningHoursAccordion hours={details.openingHours} />
                  )}

                  {/* الموقع الإلكتروني */}
                  {details.website && (
                    <a
                      href={details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 group"
                    >
                      <svg
                        className="w-4 h-4 text-sky-400/60 group-hover:text-sky-400 transition-colors flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                      <span className="text-sky-400 text-xs truncate group-hover:text-sky-300 transition-colors underline-offset-2 hover:underline">
                        {new URL(details.website).hostname}
                      </span>
                    </a>
                  )}

                  {/* زر التنقل */}
                  <button
                    onClick={onNavigate}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95 mt-1"
                    style={{
                      background: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
                      boxShadow: "0 4px 20px rgba(14,165,233,0.35)",
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    احسب الطريق إلى هنا
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── مكوّن أوقات العمل القابل للطي ──
function OpeningHoursAccordion({ hours }: { hours: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 w-full"
      >
        <svg
          className="w-4 h-4 text-sky-400/60 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-xs text-white/60 flex-1 text-right">ساعات العمل</span>
        <svg
          className={`w-3.5 h-3.5 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="mt-2 rounded-xl p-3 space-y-1"
              style={{
                background: "rgba(14,22,40,0.6)",
                border: "1px solid rgba(56,189,248,0.1)",
              }}
            >
              {hours.map((h, i) => (
                <p key={i} className="text-white/50 text-xs leading-relaxed">
                  {h}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
