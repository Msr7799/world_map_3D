"use client";

import { useEffect, useRef, useState } from "react";
import { availableCoronaImages, coronaTileUrl, type CoronaImage } from "@/lib/corona";

type Position = { lat: number; lng: number };

function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("ar-BH", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

export default function HistoricalImageryPanel({ map, onClose }: { map: google.maps.Map | null; onClose: () => void }) {
  const [position, setPosition] = useState<Position | null>(null);
  const [images, setImages] = useState<CoronaImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.8);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partialFailure, setPartialFailure] = useState(false);
  const overlayRef = useRef<google.maps.ImageMapType | null>(null);

  useEffect(() => {
    if (!map) return;
    const updatePosition = () => {
      const center = map.getCenter();
      if (!center) return;
      const next = { lat: center.lat(), lng: center.lng() };
      setPosition((previous) => previous && Math.abs(previous.lat - next.lat) < 0.005 && Math.abs(previous.lng - next.lng) < 0.005
        ? previous : next);
    };
    updatePosition();
    const listener = map.addListener("idle", updatePosition);
    return () => listener.remove();
  }, [map]);

  useEffect(() => {
    if (!position) return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setImages([]);
    setSelectedId(null);
    setLoading(true);
    setError(null);
    setPartialFailure(false);

    availableCoronaImages(position.lat, position.lng, controller.signal)
      .then(({ images: found, failed }) => {
        if (disposed) return;
        if (controller.signal.aborted) {
          setError("انتهت مهلة الاتصال بأرشيف الصور التاريخية. حاول مرة أخرى بتحريك الخريطة.");
          return;
        }
        if (found.length === 0 && failed > 0) {
          setError("تعذر التحقق من بعض صور CORONA لهذا الموقع حاليًا. حرّك الخريطة أو حاول لاحقًا.");
          return;
        }
        setImages(found);
        setSelectedId(found[found.length - 1]?.id ?? null);
        setPartialFailure(failed > 0);
      })
      .catch(() => { if (!disposed) setError("تعذر الاتصال بأرشيف الصور التاريخية."); })
      .finally(() => { if (!disposed) setLoading(false); });

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [position]);

  const selectedImage = images.find((image) => image.id === selectedId);
  const selectedIndex = selectedImage ? images.indexOf(selectedImage) : images.length;

  useEffect(() => {
    if (!map || !selectedImage) return;
    const overlay = new google.maps.ImageMapType({
      tileSize: new google.maps.Size(256, 256),
      opacity,
      maxZoom: 22,
      getTileUrl: (tile, zoom) => coronaTileUrl(selectedImage, tile.x, tile.y, zoom),
    });
    map.overlayMapTypes.push(overlay);
    overlayRef.current = overlay;
    return () => {
      for (let i = map.overlayMapTypes.getLength() - 1; i >= 0; i -= 1) {
        if (map.overlayMapTypes.getAt(i) === overlay) map.overlayMapTypes.removeAt(i);
      }
      if (overlayRef.current === overlay) overlayRef.current = null;
    };
    // Opacity updates the existing overlay without reloading its tiles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedImage]);

  useEffect(() => { overlayRef.current?.setOpacity(opacity); }, [opacity]);

  const showExample = () => {
    if (!map) return;
    map.setCenter({ lat: 35.3847, lng: 33.8783 });
    map.setZoom(13);
  };

  return (
    <section
      aria-label="الصور التاريخية"
      dir="rtl"
      className="absolute bottom-4 left-4 right-4 z-20 max-h-[55svh] overflow-y-auto rounded-2xl border border-sky-300/25 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto sm:w-[min(430px,calc(100vw-3rem))]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-sky-200">صور الأرض عبر الزمن</h2>
          <p className="mt-1 text-xs text-slate-300">صور CORONA الفضائية الأصلية، 1963–1972</p>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق الصور التاريخية" className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white">✕</button>
      </div>

      {!map || loading ? <p className="py-3 text-sm text-slate-300">جارٍ البحث عن صور متاحة لهذا الموقع…</p> : error ? (
        <p role="alert" className="py-3 text-sm text-amber-200">{error}</p>
      ) : images.length === 0 ? (
        <div className="space-y-3 py-2 text-sm text-slate-300">
          <p>لا توجد صورة مؤكدة لمركز الخريطة هنا. تتوفر صور الستينات لمناطق محددة فقط؛ حرّك الخريطة للبحث في مكان آخر.</p>
          <button type="button" onClick={showExample} className="rounded-lg border border-sky-400/40 px-3 py-2 text-xs font-bold text-sky-200 hover:bg-sky-400/10">جرّب صورة متاحة من عام 1967</button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-300">{images.length} {images.length === 1 ? "صورة متاحة" : "صور متاحة"} لهذا الموقع</p>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <strong className="text-sky-200">{selectedImage ? formatDate(selectedImage.date) : "الحاضر"}</strong>
              <span className="text-xs text-slate-400" dir="ltr">{selectedImage ? `CORONA ${selectedImage.id}` : "Google Maps"}</span>
            </div>
            <p className="mt-3 text-xs text-slate-300">اسحب الشريط بين الحاضر والصور السابقة</p>
            <input
              type="range"
              min={0}
              max={images.length}
              value={selectedIndex}
              onChange={(event) => {
                const index = Number(event.target.value);
                setSelectedId(index === images.length ? null : images[index].id);
              }}
              aria-label="اختيار تاريخ الصورة"
              aria-valuetext={selectedImage ? formatDate(selectedImage.date) : "الحاضر"}
              className="mt-2 w-full accent-sky-400"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>{images[0].date.slice(0, 4)} · الأقدم</span>
              <span>الحاضر</span>
            </div>
          </div>
          {selectedImage && (
            <label className="flex items-center gap-3 text-xs text-slate-300">
              <span className="shrink-0">مقارنة بالحاضر</span>
              <input type="range" min={0.15} max={1} step={0.05} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} aria-label="شفافية الصورة التاريخية" className="w-full accent-sky-400" />
            </label>
          )}
          {partialFailure && <p className="text-xs text-amber-200">تعذر التحقق من بعض الصور الأخرى في الأرشيف.</p>}
        </div>
      )}

      <p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-slate-400">
        الصور بالأبيض والأسود وتغطيتها غير مكتملة. المصدر: <a className="text-sky-300 underline" href="https://cast.uark.edu/capabilities/corona.php" target="_blank" rel="noopener noreferrer">أطلس CORONA بجامعة أركنساس</a>؛ الاستخدام غير التجاري فقط.
      </p>
    </section>
  );
}
