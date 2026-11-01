"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { availableCoronaImages, coronaTileUrl, type CoronaImage } from "@/lib/corona";
import { availableBahrainImages, bahrainImages, bahrainTileView, type BahrainImage } from "@/lib/mapbh";
import { availableWaybackImages, waybackCaptureMetadata, waybackTileUrl, type WaybackItem, type WaybackMetadata } from "@/lib/wayback";

type Position = { lat: number; lng: number; zoom: number };
type TimelineEntry =
  | { key: string; date: string; kind: "corona"; image: CoronaImage }
  | { key: string; date: string; kind: "mapbh"; image: BahrainImage }
  | { key: string; date: string; kind: "wayback"; image: WaybackItem };

function createArchiveBackdrop(): google.maps.MapType {
  return {
    alt: null,
    maxZoom: 22,
    minZoom: 0,
    name: null,
    projection: null,
    radius: 6378137,
    tileSize: new google.maps.Size(256, 256),
    getTile(_coord, _zoom, ownerDocument) {
      const tile = ownerDocument.createElement("div");
      tile.style.width = "256px";
      tile.style.height = "256px";
      tile.style.backgroundColor = "#e5e1d8";
      return tile;
    },
    releaseTile() {},
  };
}

function createBahrainOverlay(image: BahrainImage): google.maps.MapType {
  return {
    alt: null,
    maxZoom: 22,
    minZoom: 0,
    name: null,
    projection: null,
    radius: 6378137,
    tileSize: new google.maps.Size(256, 256),
    getTile(coord, zoom, ownerDocument) {
      const tile = ownerDocument.createElement("div");
      tile.style.width = "256px";
      tile.style.height = "256px";
      const view = bahrainTileView(image, coord.x, coord.y, zoom);
      if (view) {
        tile.style.backgroundImage = `url("${view.url}")`;
        tile.style.backgroundRepeat = "no-repeat";
        tile.style.backgroundSize = `${256 * view.scale}px ${256 * view.scale}px`;
        tile.style.backgroundPosition = `${-256 * view.offsetX}px ${-256 * view.offsetY}px`;
      }
      return tile;
    },
    releaseTile() {},
  };
}

function formatDate(date: string) {
  if (/^\d{4}$/.test(date)) return date;
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("ar-BH", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

function formatTimestamp(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("ar-BH", {
    year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

export default function HistoricalImageryPanel({ map, onClose }: { map: google.maps.Map | null; onClose: () => void }) {
  const [position, setPosition] = useState<Position | null>(null);
  const [mapZoom, setMapZoom] = useState(13);
  const [mode, setMode] = useState<"photo" | "map">("photo");
  const [coronaImages, setCoronaImages] = useState<CoronaImage[]>([]);
  const [waybackImages, setWaybackImages] = useState<WaybackItem[]>([]);
  const [selection, setSelection] = useState("present");
  const [coronaResultKey, setCoronaResultKey] = useState<string | null>(null);
  const [waybackResultKey, setWaybackResultKey] = useState<string | null>(null);
  const [coronaLoading, setCoronaLoading] = useState(true);
  const [waybackLoading, setWaybackLoading] = useState(true);
  const [coronaFailed, setCoronaFailed] = useState(false);
  const [waybackFailed, setWaybackFailed] = useState(false);
  const [captureMetadata, setCaptureMetadata] = useState<WaybackMetadata | null>(null);
  const [metadataResolved, setMetadataResolved] = useState(false);
  const prefetchedTilesRef = useRef(new Map<string, HTMLImageElement>());

  const positionKey = position ? `${position.lat.toFixed(5)}/${position.lng.toFixed(5)}/${position.zoom}` : null;

  useEffect(() => {
    if (!map) return;
    const updatePosition = () => {
      const center = map.getCenter();
      if (!center) return;
      const currentZoom = map.getZoom() ?? 13;
      setMapZoom(currentZoom);
      const next = { lat: center.lat(), lng: center.lng(), zoom: Math.max(11, Math.min(15, currentZoom)) };
      setPosition((previous) => previous && Math.abs(previous.lat - next.lat) < 0.005 && Math.abs(previous.lng - next.lng) < 0.005 && previous.zoom === next.zoom
        ? previous : next);
    };
    updatePosition();
    const listener = map.addListener("idle", updatePosition);
    return () => listener.remove();
  }, [map]);

  useEffect(() => {
    if (!position || !positionKey || mode === "map") return;
    const controller = new AbortController();
    let disposed = false;
    const timeout = window.setTimeout(() => controller.abort(), 25000);
    setCoronaResultKey(null);
    setWaybackResultKey(null);
    setCoronaLoading(true);
    setWaybackLoading(true);
    setCoronaFailed(false);
    setWaybackFailed(false);

    availableCoronaImages(position.lat, position.lng, controller.signal)
      .then(({ images, failed }) => {
        if (disposed) return;
        setCoronaImages(images);
        setCoronaFailed(failed > 0 || controller.signal.aborted);
      })
      .catch(() => { if (!disposed) setCoronaFailed(true); })
      .finally(() => { if (!disposed) { setCoronaResultKey(positionKey); setCoronaLoading(false); } });

    // Wait briefly after map movement so repeated pans do not start costly scans.
    const waybackDelay = window.setTimeout(() => {
      availableWaybackImages(position.lat, position.lng, position.zoom, controller.signal)
        .then((items) => { if (!disposed) setWaybackImages(items); })
        .catch(() => { if (!disposed) setWaybackFailed(true); })
        .finally(() => { if (!disposed) { setWaybackResultKey(positionKey); setWaybackLoading(false); } });
    }, 300);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      window.clearTimeout(waybackDelay);
      controller.abort();
    };
  }, [position, positionKey, mode]);

  const entries = useMemo<TimelineEntry[]>(() => [
    ...(mode === "photo" && coronaResultKey === positionKey ? coronaImages.map((image) => ({ key: `corona:${image.id}`, date: image.date, kind: "corona" as const, image })) : []),
    ...(position ? availableBahrainImages(position.lat, position.lng).filter((image) => image.type === mode).map((image) => ({ key: `mapbh:${image.id}`, date: image.date, kind: "mapbh" as const, image })) : []),
    ...(mode === "photo" && waybackResultKey === positionKey ? waybackImages.map((image) => ({ key: `wayback:${image.releaseNum}`, date: image.releaseDateLabel, kind: "wayback" as const, image })) : []),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.key.localeCompare(b.key)), [coronaImages, coronaResultKey, mode, position, positionKey, waybackImages, waybackResultKey]);

  const selectedEntry = selection === "auto" ? entries[entries.length - 1] : entries.find((entry) => entry.key === selection);
  const selectedIndex = selectedEntry ? entries.indexOf(selectedEntry) : entries.length;
  const selectedRelease = selectedEntry?.kind === "wayback" ? selectedEntry.image.releaseNum : null;

  useEffect(() => {
    setCaptureMetadata(null);
    setMetadataResolved(false);
    if (!position || selectedRelease === null) return;
    let disposed = false;
    const timeout = window.setTimeout(() => {
      waybackCaptureMetadata(position.lat, position.lng, position.zoom, selectedRelease)
        .then((metadata) => { if (!disposed) setCaptureMetadata(metadata); })
        .catch(() => { if (!disposed) setCaptureMetadata(null); })
        .finally(() => { if (!disposed) setMetadataResolved(true); });
    }, 250);
    return () => { disposed = true; window.clearTimeout(timeout); };
  }, [position, selectedRelease]);

  const hasHistoricalSelection = Boolean(selectedEntry);

  // A solid archive canvas prevents modern imagery from showing through
  // transparent archive pixels or gaps between historical coverage tiles.
  useEffect(() => {
    if (!map || !hasHistoricalSelection) return;
    const backdrop = createArchiveBackdrop();
    map.overlayMapTypes.push(backdrop);
    return () => {
      for (let i = map.overlayMapTypes.getLength() - 1; i >= 0; i -= 1) {
        if (map.overlayMapTypes.getAt(i) === backdrop) map.overlayMapTypes.removeAt(i);
      }
    };
  }, [map, hasHistoricalSelection]);

  useEffect(() => {
    if (!map || !selectedEntry) return;
    const overlay: google.maps.MapType = selectedEntry.kind === "mapbh"
      ? createBahrainOverlay(selectedEntry.image)
      : new google.maps.ImageMapType({
        tileSize: new google.maps.Size(256, 256),
        opacity: 1,
        maxZoom: 22,
        getTileUrl: (tile, zoom) => selectedEntry.kind === "corona"
          ? coronaTileUrl(selectedEntry.image, tile.x, tile.y, zoom)
          : waybackTileUrl(selectedEntry.image, tile.x, tile.y, zoom),
      });
    map.overlayMapTypes.push(overlay);
    return () => {
      for (let i = map.overlayMapTypes.getLength() - 1; i >= 0; i -= 1) {
        if (map.overlayMapTypes.getAt(i) === overlay) map.overlayMapTypes.removeAt(i);
      }
    };
  }, [map, selectedEntry]);

  // Warm the center tile for the next timeline step without downloading a
  // full historical layer. Browser image caching handles repeat visits.
  useEffect(() => {
    if (!position || entries.length === 0) return;
    const timeout = window.setTimeout(() => {
      const zoom = Math.floor(mapZoom);
      const count = 2 ** zoom;
      const x = Math.floor((position.lng + 180) / 360 * count);
      const y = Math.floor((1 - Math.asinh(Math.tan(position.lat * Math.PI / 180)) / Math.PI) / 2 * count);
      const selectedIndex = entries.findIndex((entry) => entry.key === selection);
      const index = selectedIndex < 0 ? entries.length : selectedIndex;
      for (const neighbor of [entries[index - 1], entries[index + 1]]) {
        if (!neighbor || neighbor.kind === "corona") continue;
        const url = neighbor.kind === "mapbh"
          ? bahrainTileView(neighbor.image, x, y, zoom)?.url
          : waybackTileUrl(neighbor.image, x, y, zoom);
        if (!url || prefetchedTilesRef.current.has(url)) continue;
        const image = new Image();
        image.decoding = "async";
        image.src = url;
        prefetchedTilesRef.current.set(url, image);
        if (prefetchedTilesRef.current.size > 48) {
          const oldest = prefetchedTilesRef.current.keys().next().value;
          if (oldest) prefetchedTilesRef.current.delete(oldest);
        }
      }
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [entries, mapZoom, position, selection]);

  const loading = mode === "photo" && (coronaLoading || waybackLoading || coronaResultKey !== positionKey || waybackResultKey !== positionKey);
  const bahrainCount = entries.filter((entry) => entry.kind === "mapbh").length;
  const archiveOptions = bahrainImages.filter((image) => image.type === mode);
  const chooseBahrainImage = (image: BahrainImage) => {
    if (!map) return;
    const [west, south, east, north] = image.bounds;
    setSelection(`mapbh:${image.id}`);
    map.panTo({ lat: (south + north) / 2, lng: (west + east) / 2 });
    map.setZoom(Math.min(image.maxZoom, Math.max(image.minZoom, 13)));
  };
  const selectTimelinePosition = (index: number) => {
    setSelection(index === entries.length ? "present" : entries[index].key);
  };

  return (
    <section
      aria-label="الصور التاريخية"
      dir="rtl"
      className="absolute bottom-4 left-4 right-4 z-20 max-h-[55svh] overflow-y-auto rounded-2xl border border-sky-300/25 bg-slate-950/95 p-4 text-white shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto sm:w-[min(430px,calc(100vw-3rem))]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-sky-200">البحرين والعالم عبر الزمن</h2>
          <p className="mt-1 text-xs text-slate-300">حرّك الشريط لمشاهدة الطبقات المتاحة لهذا المكان</p>
        </div>
        <button type="button" onClick={onClose} aria-label="إغلاق الصور التاريخية" className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10 hover:text-white">✕</button>
      </div>

      <div className="mb-3 flex gap-2" role="group" aria-label="نوع الطبقة التاريخية">
        <button type="button" aria-pressed={mode === "photo"} onClick={() => { setMode("photo"); setSelection("present"); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === "photo" ? "bg-sky-500 text-slate-950" : "border border-sky-400/30 text-sky-200"}`}>صور فضائية</button>
        <button type="button" aria-pressed={mode === "map"} onClick={() => { setMode("map"); setSelection("present"); }} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${mode === "map" ? "bg-sky-500 text-slate-950" : "border border-sky-400/30 text-sky-200"}`}>خرائط قديمة</button>
      </div>

      {map && <div className="mb-3 space-y-1.5">
        <label htmlFor="bahrain-archive-layer" className="block text-xs text-slate-300">تصفح جميع طبقات البحرين المنشورة ({archiveOptions.length})</label>
        <select
          id="bahrain-archive-layer"
          value={selectedEntry?.kind === "mapbh" ? selectedEntry.image.id : ""}
          onChange={(event) => {
            const image = archiveOptions.find((item) => item.id === event.currentTarget.value);
            if (image) chooseBahrainImage(image);
          }}
          className="w-full rounded-lg border border-sky-400/30 bg-slate-900 px-2 py-2 text-xs text-white"
        >
          <option value="">اختر طبقة للانتقال إلى موقعها</option>
          {archiveOptions.map((image) => <option key={image.id} value={image.id}>{image.date} · {image.name}</option>)}
        </select>
        {mode === "map" && <button type="button" onClick={() => chooseBahrainImage(archiveOptions[0])} className="text-xs text-sky-300 underline">انتقل إلى أقدم خريطة منشورة (1862)</button>}
      </div>}

      {!map || (loading && entries.length === 0) ? <p className="py-3 text-sm text-slate-300">جارٍ البحث عن صور متاحة لهذا الموقع…</p> : entries.length === 0 ? (
        <div className="space-y-3 py-2 text-sm text-slate-300">
          <p>{mode === "photo" && (coronaFailed || waybackFailed) ? "تعذّر تحميل بعض الأرشيفات. حرّك الخريطة أو حاول لاحقًا." : "لا توجد طبقة متاحة لمركز الخريطة هنا. حرّك الخريطة للبحث في مكان آخر."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-300" aria-live="polite">{entries.length} {mode === "map" ? entries.length === 1 ? "خريطة متاحة" : "خرائط متاحة" : entries.length === 1 ? "صورة متاحة" : "صور متاحة"} لهذا الموقع{loading ? " · جارٍ فحص المزيد…" : ""}</p>
          {mode === "photo" && bahrainCount > 0 && <p className="text-[11px] text-emerald-300">صور البحرين القديمة جاهزة الآن ({bahrainCount}) · الأقدم {entries[0].date.slice(0, 4)}</p>}
          {mode === "photo" && waybackResultKey !== positionKey && <p className="text-[11px] text-slate-400">جارٍ تحميل إصدارات Esri الأخرى في الخلفية؛ يمكنك سحب الشريط الآن.</p>}
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <div className="flex items-center justify-between gap-2 text-sm">
              <strong className="text-sky-200">{selectedEntry ? formatDate(selectedEntry.date) : "الحاضر"}</strong>
              <span className="text-xs text-slate-400" dir="ltr">{selectedEntry?.kind === "corona" ? "CORONA" : selectedEntry?.kind === "mapbh" ? "mapBH" : selectedEntry?.kind === "wayback" ? "Esri Wayback" : "Google Maps"}</span>
            </div>
            {selectedEntry?.kind === "mapbh" && <p className="mt-1 text-xs text-slate-200"><span dir="ltr" className="inline-block">{selectedEntry.image.name}</span> · <a className="text-sky-300 underline" href={`https://map.mapbh.org/data/${encodeURIComponent(selectedEntry.image.id)}.json`} target="_blank" rel="noopener noreferrer">بيانات الطبقة الأصلية</a></p>}
            {selectedEntry?.kind === "wayback" && <p className="mt-1 text-[11px] text-slate-400">تاريخ إصدار الأرشيف · {captureMetadata?.date ? `التُقطت الصورة: ${formatTimestamp(captureMetadata.date)}` : metadataResolved ? "تاريخ الالتقاط غير متاح" : "جارٍ التحقق من تاريخ الالتقاط"}{captureMetadata?.provider ? ` · ${captureMetadata.provider}` : ""}</p>}
            {selectedEntry?.kind === "corona" && <p className="mt-1 text-[11px] text-slate-400">تاريخ التقاط صورة CORONA</p>}
            {selectedEntry?.kind === "mapbh" && <p className="mt-1 text-[11px] text-slate-400">{selectedEntry.image.type === "photo" ? selectedEntry.image.date.length === 4 ? "سنة طبقة الصور في الأرشيف؛ يوم الالتقاط غير مؤكد" : "تاريخ التقاط الصورة بحسب فهرس mapBH" : "سنة الخريطة بحسب فهرس mapBH"} · التغطية محدودة بحدود المصدر{mapZoom > selectedEntry.image.maxZoom ? ` · الصورة مكبّرة من مستوى ${selectedEntry.image.maxZoom} وقد تقل حدتها` : ""}{mapZoom < selectedEntry.image.minZoom ? ` · كبّر الخريطة إلى مستوى ${selectedEntry.image.minZoom} لعرضها` : ""}</p>}
            <p className="mt-3 text-xs text-slate-300">اسحب الشريط للرجوع إلى الصور الأقدم أو العودة إلى الحاضر</p>
            <input
              type="range"
              min={0}
              max={entries.length}
              value={selectedIndex}
              onInput={(event) => selectTimelinePosition(Number(event.currentTarget.value))}
              onChange={(event) => selectTimelinePosition(Number(event.currentTarget.value))}
              aria-label="اختيار تاريخ الصورة"
              aria-valuetext={selectedEntry ? `${formatDate(selectedEntry.date)}، ${selectedEntry.kind === "corona" ? "CORONA" : selectedEntry.kind === "mapbh" ? selectedEntry.image.type === "photo" ? "صورة فضائية للبحرين" : "خريطة مرسومة للبحرين" : "إصدار Esri Wayback"}` : "الحاضر"}
              dir="ltr"
              className="mt-2 w-full accent-sky-400"
            />
            <div dir="ltr" className="flex justify-between text-[11px] text-slate-400">
              <span>{entries[0].date.slice(0, 4)} · الأقدم</span>
              <span>الحاضر</span>
            </div>
            <div dir="ltr" className="mt-2 flex justify-between text-[11px]">
              <button type="button" onClick={() => setSelection(entries[0].key)} className="text-sky-300 underline">اعرض الأقدم ({entries[0].date.slice(0, 4)})</button>
              <button type="button" onClick={() => setSelection("present")} className="text-sky-300 underline">العودة للحاضر</button>
            </div>
          </div>
          {mode === "photo" && !coronaLoading && coronaImages.length === 0 && !coronaFailed && !entries.some((entry) => entry.kind === "mapbh") && <p className="text-xs text-slate-300">لا توجد صور من الستينات أو السبعينات لهذا الموقع في الأرشيف الحالي. الشريط يعرض صور هذا المكان فقط.</p>}
          {mode === "photo" && (coronaFailed || waybackFailed) && <p className="text-xs text-amber-200">تعذّر التحقق من بعض الصور في الأرشيف؛ التواريخ المعروضة هي المتاحة حاليًا.</p>}
        </div>
      )}

      <p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-slate-400">
        التواريخ المتاحة تختلف حسب الموقع وقد تفصلها سنوات. أقدم خريطة مصوّرة قابلة للعرض هنا من 1862؛ توجد خرائط أقدم في <a className="text-sky-300 underline" href="https://www.mapbh.org/secure/catalogue" target="_blank" rel="noopener noreferrer">فهرس mapBH</a> لم تُنشر كطبقات تفاعلية. المصادر: <a className="text-sky-300 underline" href="https://map.mapbh.org/" target="_blank" rel="noopener noreferrer">طبقات mapBH</a>، <a className="text-sky-300 underline" href="https://livingatlas.arcgis.com/wayback/" target="_blank" rel="noopener noreferrer">Esri World Imagery Wayback</a> و<a className="text-sky-300 underline" href="https://cast.uark.edu/capabilities/corona.php" target="_blank" rel="noopener noreferrer">أطلس CORONA بجامعة أركنساس</a>. صور أطلس CORONA للاستخدام غير التجاري فقط.
      </p>
    </section>
  );
}
