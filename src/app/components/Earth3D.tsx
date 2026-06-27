"use client";

import React, { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { useEarthStore } from "@/lib/store";
import { initGoogleMaps, latLngToVector3, fetchPlaceDetails, calculateRoute, reverseGeocode } from "@/lib/maps";
import type { EarthMarker, PlaceDetails, RouteResult, DroppedPin } from "@/types";
import PlaceInfoPanel from "@/components/PlaceInfoPanel";
import RoutePanel from "@/components/RoutePanel";

function getResponsiveDistanceMultiplier(size: { width: number; height: number }) {
  const aspect = size.width / Math.max(size.height, 1);
  if (aspect < 0.72 || size.width < 640) return 1.55;
  if (size.width < 1024) return 1.35;
  return 1;
}

const ROAD_MAP_ENTER_DISTANCE = 1.62;
const ROAD_MAP_EXIT_DISTANCE = 1.82;

function cameraPositionToLatLng(position: THREE.Vector3) {
  const normalized = position.clone().normalize();
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(normalized.y, -1, 1)));
  const theta = Math.atan2(normalized.z, -normalized.x);
  const lng = ((((THREE.MathUtils.radToDeg(theta) - 180) + 540) % 360) - 180);
  return { lat, lng };
}

function Atmosphere() {
  const { showAtmosphere } = useEarthStore();
  if (!showAtmosphere) return null;
  return (
    <mesh scale={[1.05, 1.05, 1.05]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial color="#4fc3f7" transparent opacity={0.08} side={THREE.FrontSide} depthWrite={false} />
    </mesh>
  );
}

function EarthGrid() {
  const { showGrid } = useEarthStore();
  if (!showGrid) return null;
  const lineObjects: THREE.Line[] = [];
  for (let lng = -180; lng <= 180; lng += 30) {
    const points: THREE.Vector3[] = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      const [x, y, z] = latLngToVector3(lat, lng, 1.002);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    lineObjects.push(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#38bdf8", transparent: true, opacity: 0.2 })));
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const points: THREE.Vector3[] = [];
    for (let lng2 = -180; lng2 <= 180; lng2 += 5) {
      const [x, y, z] = latLngToVector3(lat, lng2, 1.002);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    lineObjects.push(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: "#38bdf8", transparent: true, opacity: 0.2 })));
  }
  return (
    <group>
      {lineObjects.map((line, i) => <primitive key={i} object={line} />)}
    </group>
  );
}

function LocationMarker({ marker, onClick }: { marker: EarthMarker; onClick: (m: EarthMarker) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const { size } = useThree();
  const [x, y, z] = latLngToVector3(marker.lat, marker.lng, 1.03);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.9;
      meshRef.current.scale.setScalar(pulse * (marker.size || 1));
    }
    if (labelRef.current) {
      const dm = getResponsiveDistanceMultiplier(size);
      const nd = state.camera.position.length() / dm;
      let opacity = 1;
      let scale = 1;
      if (nd < 2.0) {
        const t = Math.max(0, Math.min(1, (nd - 1.68) / (2.0 - 1.68)));
        opacity = t; scale = 0.5 + t * 0.5;
      } else if (nd > 3.5) {
        const t = Math.max(0, Math.min(1, (5.5 - nd) / (5.5 - 3.5)));
        opacity = t; scale = 0.6 + t * 0.4;
      }
      labelRef.current.style.opacity = opacity.toString();
      labelRef.current.style.transform = `scale(${scale})`;
      labelRef.current.style.display = opacity <= 0.001 ? "none" : "block";
    }
  });

  return (
    <group position={[x, y, z]}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(marker); }}>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial color={marker.color || "#f59e0b"} emissive={marker.color || "#f59e0b"} emissiveIntensity={1.5} roughness={0} metalness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.018, 0.025, 32]} />
        <meshBasicMaterial color={marker.color || "#f59e0b"} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <Html position={[0, 0.04, 0]} center style={{ pointerEvents: "none" }}>
        <div ref={labelRef} className="whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-bold shadow-lg"
          style={{ background: "rgba(6,13,26,0.85)", color: marker.color || "#f59e0b", border: `1px solid ${marker.color || "#f59e0b"}`, boxShadow: `0 0 10px ${(marker.color || "#f59e0b")}40`, backdropFilter: "blur(8px)", fontFamily: "system-ui, sans-serif", direction: "rtl", transformOrigin: "center bottom" }}>
          {marker.name}
        </div>
      </Html>
    </group>
  );
}

function getSunPosition(): THREE.Vector3 {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = (23.45 * Math.PI / 180) * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const hourAngle = ((utcHours - 12) / 24) * 2 * Math.PI;
  const x = Math.cos(declination) * Math.sin(hourAngle);
  const y = Math.sin(declination);
  const z = Math.cos(declination) * Math.cos(hourAngle);
  return new THREE.Vector3(x, y, z).multiplyScalar(-10);
}

function EarthSphere() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);
  const { camera, size } = useThree();
  const { isRotating, rotationSpeed, currentLat, currentLng, zoom, showClouds, nightMode, markers, selectMarker, selectedMarker } = useEarthStore();
  const [dayTexture, setDayTexture] = React.useState<THREE.Texture | null>(null);
  const [cloudsTexture, setCloudsTexture] = React.useState<THREE.Texture | null>(null);
  const [lightsTexture, setLightsTexture] = React.useState<THREE.Texture | null>(null);

  React.useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load("/textures/earth_day.jpeg", (t) => { t.colorSpace = THREE.SRGBColorSpace; setDayTexture(t); }, undefined, () => setDayTexture(null));
    loader.load("/textures/earth_clouds.png", (t) => { t.colorSpace = THREE.SRGBColorSpace; setCloudsTexture(t); }, undefined, () => setCloudsTexture(null));
    loader.load("/textures/earth_lights_2048.png", (t) => { t.colorSpace = THREE.SRGBColorSpace; setLightsTexture(t); }, undefined, () => setLightsTexture(null));
  }, []);

  useEffect(() => {
    if (!camera) return;
    const rz = zoom * getResponsiveDistanceMultiplier(size);
    const [tx, ty, tz] = latLngToVector3(currentLat, currentLng, rz);
    gsap.to(camera.position, { x: tx, y: ty, z: tz, duration: 1.8, ease: "power2.inOut" });
  }, [currentLat, currentLng, zoom, camera, size.height, size.width]);

  useFrame((_, delta) => {
    if (groupRef.current && isRotating) groupRef.current.rotation.y += delta * (rotationSpeed * 0.05);
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.012;
    if (sunLightRef.current) sunLightRef.current.position.copy(getSunPosition());
  });

  const sunPos = React.useMemo(() => getSunPosition(), []);

  return (
    <group ref={groupRef}>
      <directionalLight ref={sunLightRef} position={sunPos} intensity={0.7} color="#fffaf0" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[1, 128, 128]} />
        {dayTexture ? <meshBasicMaterial map={dayTexture} /> : <meshStandardMaterial color="#2a7fc4" roughness={0.8} metalness={0.0} />}
      </mesh>
      {lightsTexture && (
        <mesh scale={[1.001, 1.001, 1.001]}>
          <sphereGeometry args={[1, 128, 128]} />
          <meshBasicMaterial map={lightsTexture} transparent opacity={nightMode ? 0.85 : 0.55} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {showClouds && (
        <mesh ref={cloudsRef} scale={[1.008, 1.008, 1.008]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial map={cloudsTexture ?? undefined} transparent opacity={cloudsTexture ? 0.35 : 0.15} depthWrite={false} roughness={1} metalness={0} />
        </mesh>
      )}
      <Atmosphere />
      <EarthGrid />
      {markers.map((marker: EarthMarker) => (
        <LocationMarker key={marker.id} marker={marker} onClick={(m) => { selectMarker(selectedMarker?.id === m.id ? null : m); }} />
      ))}
    </group>
  );
}

function SkyBox() {
  const [starsTexture, setStarsTexture] = React.useState<THREE.Texture | null>(null);
  React.useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load("/textures/2k_stars_milky_way.jpg", (t) => { t.colorSpace = THREE.SRGBColorSpace; setStarsTexture(t); }, undefined, () => setStarsTexture(null));
  }, []);
  if (!starsTexture) return null;
  return (
    <mesh>
      <sphereGeometry args={[90, 64, 64]} />
      <meshBasicMaterial map={starsTexture} side={THREE.BackSide} />
    </mesh>
  );
}

function ResponsiveCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / Math.max(size.height, 1);
    const isPhone = aspect < 0.72 || size.width < 640;
    const isTablet = !isPhone && size.width < 1024;
    camera.fov = isPhone ? 52 : isTablet ? 46 : 42;
    const nextDist = 2.5 * getResponsiveDistanceMultiplier(size);
    if (Math.abs(camera.position.length() - 2.5) < 0.08) camera.position.setLength(nextDist);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);
  return null;
}

function RoadMapZoomBridge({ onRoadMapState }: { onRoadMapState: (s: { active: boolean; center: { lat: number; lng: number } }) => void }) {
  const { camera, size } = useThree();
  const activeRef = useRef(false);
  const lastCenterRef = useRef({ lat: 24, lng: 45 });
  const frameRef = useRef(0);

  useFrame(() => {
    frameRef.current += 1;
    const dm = getResponsiveDistanceMultiplier(size);
    const distance = camera.position.length() / dm;
    const shouldEnter = distance <= ROAD_MAP_ENTER_DISTANCE;
    const shouldExit = distance >= ROAD_MAP_EXIT_DISTANCE;
    if ((!activeRef.current && shouldEnter) || (activeRef.current && shouldExit)) {
      activeRef.current = shouldEnter;
      lastCenterRef.current = cameraPositionToLatLng(camera.position);
      onRoadMapState({ active: activeRef.current, center: lastCenterRef.current });
      return;
    }
    if (activeRef.current && frameRef.current % 18 === 0) {
      const nc = cameraPositionToLatLng(camera.position);
      if (Math.abs(nc.lat - lastCenterRef.current.lat) > 0.02 || Math.abs(nc.lng - lastCenterRef.current.lng) > 0.02) {
        lastCenterRef.current = nc;
        onRoadMapState({ active: true, center: nc });
      }
    }
  });
  return null;
}

// =====================================================
// GoogleRoadMapOverlay — الخريطة الكاملة مع جميع الميزات
// =====================================================
function GoogleRoadMapOverlay({ active, center, onClose }: { active: boolean; center: { lat: number; lng: number }; onClose: () => void }) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const droppedPinMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [mapType, setMapType] = React.useState<"roadmap" | "hybrid">("roadmap");
  const [placeDetails, setPlaceDetails] = React.useState<PlaceDetails | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = React.useState(false);
  const [droppedPin, setDroppedPin] = React.useState<DroppedPin | null>(null);
  const [showRoutePanel, setShowRoutePanel] = React.useState(false);

  // ── وضع دبوس في الموقع ──
  const dropPin = async (map: google.maps.Map, lat: number, lng: number) => {
    const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
    if (droppedPinMarkerRef.current) droppedPinMarkerRef.current.map = null;

    const pin = new PinElement({ background: "#6366f1", borderColor: "#818cf8", glyphColor: "white", scale: 1.3 });
    droppedPinMarkerRef.current = new AdvancedMarkerElement({ map, position: { lat, lng }, content: pin.element, title: "موقع محدد" });

    let address: string | undefined;
    try { address = await reverseGeocode(lat, lng); } catch { address = `${lat.toFixed(5)}°، ${lng.toFixed(5)}°`; }

    setDroppedPin({ lat, lng, address });
    setPlaceDetails(null);
    setIsLoadingPlace(false);
    setShowRoutePanel(false);
  };

  // ── إنشاء الخريطة ──
  useEffect(() => {
    let cancelled = false;
    if (!active || !mapElRef.current) return;

    initGoogleMaps().then(async () => {
      if (cancelled || !mapElRef.current || !window.google?.maps) return;

      if (!mapRef.current) {
        const map = new google.maps.Map(mapElRef.current, {
          center, zoom: 16, mapId: "DEMO_MAP_ID",
          mapTypeId: mapType === "roadmap" ? google.maps.MapTypeId.ROADMAP : google.maps.MapTypeId.HYBRID,
          disableDefaultUI: true, clickableIcons: true, gestureHandling: "greedy",
        });
        mapRef.current = map;

        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          map, suppressMarkers: false,
          polylineOptions: { strokeColor: "#38bdf8", strokeWeight: 5, strokeOpacity: 0.85 },
        });

        // نقر على مكان
        map.addListener("click", async (e: google.maps.MapMouseEvent & { placeId?: string }) => {
          if (e.placeId) e.stop?.();
          if (e.placeId) {
            setIsLoadingPlace(true); setPlaceDetails(null); setShowRoutePanel(false);
            try {
              const details = await fetchPlaceDetails(e.placeId);
              if (!cancelled) setPlaceDetails(details);
            } catch { /* ignore */ }
            finally { if (!cancelled) setIsLoadingPlace(false); }
          } else {
            setPlaceDetails(null); setIsLoadingPlace(false);
          }
        });

        // Double-click لوضع دبوس
        map.addListener("dblclick", async (e: google.maps.MapMouseEvent) => {
          e.stop?.();
          const lat = e.latLng?.lat() ?? 0;
          const lng = e.latLng?.lng() ?? 0;
          await dropPin(map, lat, lng);
        });

      } else {
        mapRef.current.setCenter(center);
        mapRef.current.setZoom(Math.max(mapRef.current.getZoom() ?? 16, 15));
        mapRef.current.setMapTypeId(mapType === "roadmap" ? google.maps.MapTypeId.ROADMAP : google.maps.MapTypeId.HYBRID);
      }
      setLoadError(null);
    }).catch(() => { if (!cancelled) setLoadError("تعذر تحميل خرائط Google. تحقق من تفعيل Maps JavaScript API والمفتاح."); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, center.lat, center.lng]);

  useEffect(() => {
    if (mapRef.current && window.google?.maps) {
      mapRef.current.setMapTypeId(mapType === "roadmap" ? google.maps.MapTypeId.ROADMAP : google.maps.MapTypeId.HYBRID);
    }
  }, [mapType]);

  // Long-press للموبايل
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    longPressTimerRef.current = setTimeout(async () => {
      if (!mapRef.current || !touchStartRef.current || !mapElRef.current) return;
      const mapDiv = mapElRef.current;
      const bounds = mapDiv.getBoundingClientRect();
      const mapBounds = mapRef.current.getBounds();
      if (!mapBounds) return;
      const ne = mapBounds.getNorthEast(); const sw = mapBounds.getSouthWest();
      const relX = (touchStartRef.current.x - bounds.left) / mapDiv.offsetWidth;
      const relY = (touchStartRef.current.y - bounds.top) / mapDiv.offsetHeight;
      const lng = sw.lng() + relX * (ne.lng() - sw.lng());
      const lat = ne.lat() - relY * (ne.lat() - sw.lat());
      await dropPin(mapRef.current, lat, lng);
    }, 700);
  };

  const handleTouchEnd = () => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } };
  const handleTouchMove = () => { if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; } };

  // حساب المسار
  const handleRequestRoute = async (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, mode: "DRIVING" | "WALKING"): Promise<RouteResult | null> => {
    if (!mapRef.current || !directionsRendererRef.current) return null;
    const data = await calculateRoute(origin, destination, mode);
    if (!data) return null;
    directionsRendererRef.current.setDirections(data.response);
    return data.result;
  };

  const clearRoute = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
    }
    setShowRoutePanel(false);
  };

  const closePinPanel = () => {
    setDroppedPin(null);
    if (droppedPinMarkerRef.current) { droppedPinMarkerRef.current.map = null; droppedPinMarkerRef.current = null; }
    clearRoute();
  };

  const routeDestination = placeDetails
    ? { name: placeDetails.name, lat: placeDetails.location.lat, lng: placeDetails.location.lng }
    : droppedPin
    ? { name: droppedPin.address ?? "الموقع المحدد", lat: droppedPin.lat, lng: droppedPin.lng }
    : null;

  return (
    <div
      className={`absolute inset-0 transition-opacity duration-500 ${active ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      style={{ zIndex: 2 }}
      aria-hidden={!active}
    >
      {/* خريطة Google */}
      <div ref={mapElRef} className="h-full w-full" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} onTouchMove={handleTouchMove} />

      {/* شريط الأدوات (يمين) */}
      <div className="absolute right-4 top-4 z-10 flex flex-col gap-2 sm:right-6">
        <div className="flex flex-col gap-2 rounded-xl p-3 shadow-2xl" style={{ direction: "rtl", background: "rgba(6,13,26,0.90)", backdropFilter: "blur(16px)", border: "1px solid rgba(56,189,248,0.22)", minWidth: 148 }}>
          <div className="text-xs font-bold text-sky-300">{mapType === "roadmap" ? "🗺️ خريطة الطرق" : "🛰️ قمر صناعي"}</div>
          <button onClick={() => setMapType(mapType === "roadmap" ? "hybrid" : "roadmap")} className="w-full rounded-lg py-1.5 text-xs font-bold text-sky-200 transition-colors hover:bg-sky-400/15 flex items-center justify-center gap-1" style={{ border: "1px solid rgba(56,189,248,0.24)" }}>
            {mapType === "roadmap" ? "🛰️ قمر صناعي" : "🗺️ خريطة طرق"}
          </button>
          <button onClick={onClose} className="w-full rounded-lg py-1.5 text-xs font-bold text-sky-200 transition-colors hover:bg-sky-400/15 flex items-center justify-center gap-1" style={{ border: "1px solid rgba(56,189,248,0.24)" }}>
            🌍 رجوع للأرض
          </button>
        </div>
        <div className="rounded-xl px-3 py-2" style={{ background: "rgba(6,13,26,0.80)", backdropFilter: "blur(12px)", border: "1px solid rgba(56,189,248,0.12)" }}>
          <p className="text-sky-300/50 text-[10px] leading-relaxed text-center" style={{ direction: "rtl" }}>💡 انقر مرتين أو اضغط مطولاً لوضع دبوس</p>
          <p className="text-sky-300/40 text-[10px] text-center" style={{ direction: "rtl" }}>انقر على مكان لعرض معلوماته</p>
        </div>
      </div>

      {/* لوحة معلومات المكان */}
      {(isLoadingPlace || placeDetails) && (
        <PlaceInfoPanel details={placeDetails} isLoading={isLoadingPlace} onClose={() => { setPlaceDetails(null); setIsLoadingPlace(false); }} onNavigate={() => setShowRoutePanel(true)} />
      )}

      {/* لوحة الدبوس */}
      {droppedPin && !showRoutePanel && !placeDetails && (
        <div className="absolute bottom-4 left-1/2 z-30" style={{ transform: "translateX(-50%)", width: "min(380px, calc(100vw - 2rem))", direction: "rtl" }}>
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "rgba(5,10,22,0.94)", backdropFilter: "blur(28px)", border: "1px solid rgba(99,102,241,0.3)", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-base" style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)" }}>📍</div>
                <div>
                  <p className="text-white font-bold text-sm">موقع محدد</p>
                  <p className="text-white/40 text-xs">{droppedPin.lat.toFixed(5)}°، {droppedPin.lng.toFixed(5)}°</p>
                </div>
              </div>
              <button onClick={closePinPanel} className="w-7 h-7 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-all">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {droppedPin.address && <p className="text-white/60 text-xs leading-relaxed px-1">📍 {droppedPin.address}</p>}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl p-2 text-center" style={{ background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.12)" }}>
                <p className="text-sky-400/50 text-xs">خط العرض</p>
                <p className="text-white font-mono text-sm font-bold">{droppedPin.lat.toFixed(4)}°</p>
              </div>
              <div className="rounded-xl p-2 text-center" style={{ background: "rgba(56,189,248,0.07)", border: "1px solid rgba(56,189,248,0.12)" }}>
                <p className="text-sky-400/50 text-xs">خط الطول</p>
                <p className="text-white font-mono text-sm font-bold">{droppedPin.lng.toFixed(4)}°</p>
              </div>
            </div>
            <button onClick={() => setShowRoutePanel(true)} className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95" style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              احسب الطريق إلى هنا
            </button>
          </div>
        </div>
      )}

      {/* لوحة المسار */}
      {showRoutePanel && routeDestination && (
        <RoutePanel destinationName={routeDestination.name} destinationLat={routeDestination.lat} destinationLng={routeDestination.lng} onClose={clearRoute} onRequestRoute={handleRequestRoute} />
      )}

      {loadError && (
        <div className="absolute bottom-6 left-1/2 z-10 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl px-4 py-3 text-center text-sm text-amber-100" style={{ background: "rgba(42,20,5,0.9)", border: "1px solid rgba(251,191,36,0.35)" }}>
          {loadError}
        </div>
      )}
    </div>
  );
}

function Scene({ onRoadMapState }: { onRoadMapState: (s: { active: boolean; center: { lat: number; lng: number } }) => void }) {
  const { setRotating } = useEarthStore();
  const { size } = useThree();
  const distanceMultiplier = getResponsiveDistanceMultiplier(size);
  return (
    <>
      <ResponsiveCamera />
      <RoadMapZoomBridge onRoadMapState={onRoadMapState} />
      <ambientLight intensity={0.04} color="#1a2a4a" />
      <pointLight position={[-8, -4, -8]} intensity={0.06} color="#0a1530" />
      <SkyBox />
      <Stars radius={300} depth={60} count={2000} factor={3} saturation={0.5} fade speed={0.3} />
      <Suspense fallback={null}><EarthSphere /></Suspense>
      <OrbitControls enablePan={false} enableZoom={true} enableRotate={true} minDistance={1.45 * distanceMultiplier} maxDistance={8 * distanceMultiplier} zoomSpeed={0.8} rotateSpeed={0.5} autoRotate={false} onStart={() => setRotating(false)} />
    </>
  );
}

export default function Earth3D() {
  const { nightMode, setZoom, setMapActive } = useEarthStore();
  const [roadMapState, setRoadMapState] = React.useState({ active: false, center: { lat: 24, lng: 45 } });

  React.useEffect(() => { setMapActive(roadMapState.active); }, [roadMapState.active, setMapActive]);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 42, near: 0.1, far: 1000 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: nightMode ? 1.0 : 1.4, outputColorSpace: THREE.SRGBColorSpace }}
        shadows dpr={[1, 1.75]} resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        style={{ background: "transparent", height: "100%", width: "100%" }}
      >
        <Scene onRoadMapState={setRoadMapState} />
      </Canvas>
      <GoogleRoadMapOverlay
        active={roadMapState.active}
        center={roadMapState.center}
        onClose={() => { setRoadMapState((s) => ({ ...s, active: false })); setZoom(2.25); }}
      />
    </div>
  );
}
