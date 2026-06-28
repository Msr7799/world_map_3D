"use client";

import React, { useRef, useEffect, Suspense, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Html, OrbitControls, useTexture } from "@react-three/drei";
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

function EarthSphere({ onEarthClick }: { onEarthClick: (nameAr: string, radius: number) => void }) {
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

  useFrame((state, delta) => {
    if (groupRef.current && isRotating) groupRef.current.rotation.y += delta * (rotationSpeed * 0.05);
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.012;
    // توجيه إضاءة الشمس على الأرض بالتزامن مع حركة الشمس المرئية في الفضاء
    const t = state.clock.elapsedTime * 0.05;
    const sunX = -Math.cos(t) * 30;
    const sunZ = -Math.sin(t) * 30;
    if (sunLightRef.current) sunLightRef.current.position.set(sunX, 0, sunZ);
  });

  const sunPos = React.useMemo(() => getSunPosition(), []);

  return (
    <group ref={groupRef} name="الأرض">
      <directionalLight ref={sunLightRef} position={sunPos} intensity={0.7} color="#fffaf0" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <mesh ref={meshRef} castShadow receiveShadow onClick={(e) => { e.stopPropagation(); onEarthClick("الأرض", 1.0); }}>
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

function RoadMapZoomBridge({
  onRoadMapState,
  selectedPlanet,
}: {
  onRoadMapState: (s: { active: boolean; center: { lat: number; lng: number } }) => void;
  selectedPlanet: SelectedPlanet | null;
}) {
  const { camera, size } = useThree();
  const activeRef = useRef(false);
  const lastCenterRef = useRef({ lat: 24, lng: 45 });
  const frameRef = useRef(0);

  useFrame(() => {
    // لا تقم بتفعيل خريطة الطرق إذا كان المستخدم يتصفح كوكباً آخر غير الأرض
    if (selectedPlanet && selectedPlanet.nameAr !== "الأرض") {
      if (activeRef.current) {
        activeRef.current = false;
        onRoadMapState({ active: false, center: lastCenterRef.current });
      }
      return;
    }

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

  // ربط store لتزامن حالة RoutePanel مع باقي الواجهة
  const setRouteActive = useEarthStore((s) => s.setRouteActive);

  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [mapType, setMapType] = React.useState<"roadmap" | "hybrid">("roadmap");
  const [placeDetails, setPlaceDetails] = React.useState<PlaceDetails | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = React.useState(false);
  const [droppedPin, setDroppedPin] = React.useState<DroppedPin | null>(null);
  const [showRoutePanel, setShowRoutePanel] = React.useState(false);

  // فتح/إغلاق لوحة المسار مع تزامن الـ store
  const openRoutePanel = () => { setShowRoutePanel(true); setRouteActive(true); };
  const closeRoutePanel = () => { setShowRoutePanel(false); setRouteActive(false); };

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
    closeRoutePanel();
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
            setIsLoadingPlace(true); setPlaceDetails(null); closeRoutePanel();
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

  // تنظيف الحالة عند إغلاق الخريطة
  useEffect(() => {
    if (!active) {
      setPlaceDetails(null);
      setIsLoadingPlace(false);
      setDroppedPin(null);
      closeRoutePanel();
      if (droppedPinMarkerRef.current) {
        droppedPinMarkerRef.current.map = null;
        droppedPinMarkerRef.current = null;
      }
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setDirections({ routes: [] } as unknown as google.maps.DirectionsResult);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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
    closeRoutePanel();
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
        <PlaceInfoPanel details={placeDetails} isLoading={isLoadingPlace} onClose={() => { setPlaceDetails(null); setIsLoadingPlace(false); }} onNavigate={openRoutePanel} />
      )}

      {/* لوحة الدبوس */}
      {droppedPin && !showRoutePanel && !placeDetails && !isLoadingPlace && (
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
            <button onClick={openRoutePanel} className="w-full py-2.5 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-95" style={{ background: "linear-gradient(135deg, #6366f1, #0ea5e9)", boxShadow: "0 4px 20px rgba(99,102,241,0.35)" }}>
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

// ─── قائمة الكواكب للتنقل السريع ──────────────────────────────────────────────
const PLANETS_LIST = [
  { nameEn: "sun", nameAr: "الشمس", radius: 7.5, icon: "☀️" },
  { nameEn: "mercury", nameAr: "عطارد", radius: 0.55, icon: "🪐" },
  { nameEn: "venus", nameAr: "الزهرة", radius: 1.2, icon: "🪐" },
  { nameEn: "earth", nameAr: "الأرض", radius: 1.0, icon: "🌍" },
  { nameEn: "moon", nameAr: "القمر", radius: 0.40, icon: "🌙" },
  { nameEn: "mars", nameAr: "المريخ", radius: 0.72, icon: "🪐" },
  { nameEn: "jupiter", nameAr: "المشتري", radius: 3.5, icon: "🪐" },
  { nameEn: "saturn", nameAr: "زحل", radius: 3.0, icon: "🪐" },
  { nameEn: "uranus", nameAr: "أورانوس", radius: 2.0, icon: "🪐" },
  { nameEn: "neptune", nameAr: "نبتون", radius: 1.9, icon: "🪐" },
];

// ─── نوع الكوكب المحدد ───────────────────────────────────────────────────────
interface SelectedPlanet {
  nameAr: string;
  radius: number;
}

// ─── easing ─────────────────────────────────────────────────────────────────
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─── FlyToCamera: تحريك الكاميرا للطيران نحو الكوكب بالاسم ───────────────────
function FlyToCamera({
  targetName,
  distance,
  onArrived,
  ctrlRef,
}: {
  targetName: string | null;
  distance: number;
  onArrived: () => void;
  ctrlRef: React.RefObject<any>;
}) {
  const { camera, scene } = useThree();
  const flyingRef   = useRef(false);
  const doneRef     = useRef(false);
  const progressRef = useRef(0);
  const startCam    = useRef(new THREE.Vector3());
  const endCam      = useRef(new THREE.Vector3());
  const startTarget = useRef(new THREE.Vector3());
  const endTarget   = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!targetName) return;
    const obj = scene.getObjectByName(targetName);
    if (!obj) return;

    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);

    flyingRef.current   = true;
    doneRef.current     = false;
    progressRef.current = 0;
    startCam.current.copy(camera.position);
    startTarget.current.copy(ctrlRef.current?.target ?? new THREE.Vector3());
    endTarget.current.copy(wp);

    const dir = camera.position.clone().sub(wp).normalize();
    if (dir.lengthSq() < 0.001) dir.set(0, 0.5, 1).normalize();
    endCam.current.copy(wp).addScaledVector(dir, distance);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetName]);

  useFrame((_, dt) => {
    if (!flyingRef.current || !targetName) return;
    const obj = scene.getObjectByName(targetName);
    if (!obj) return;

    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    endTarget.current.copy(wp);

    progressRef.current = Math.min(progressRef.current + dt * 0.75, 1);
    const e = easeInOutCubic(progressRef.current);
    camera.position.lerpVectors(startCam.current, endCam.current, e);
    if (ctrlRef.current) {
      ctrlRef.current.target.lerpVectors(startTarget.current, endTarget.current, e);
      ctrlRef.current.update();
    }
    if (progressRef.current >= 1 && !doneRef.current) {
      doneRef.current   = true;
      flyingRef.current = false;
      onArrived();
    }
  });

  return null;
}

// ─── حلقات زحل ───────────────────────────────────────────────────────────────
function SaturnRings({ inner, outer, texture }: { inner: number; outer: number; texture: THREE.Texture }) {
  const geom = React.useMemo(() => {
    const g = new THREE.RingGeometry(inner, outer, 96, 4);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = v.length();
      uv.setXY(i, (r - inner) / (outer - inner), 1);
    }
    uv.needsUpdate = true;
    return g;
  }, [inner, outer]);
  return (
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent opacity={0.88} depthWrite={false} />
    </mesh>
  );
}

// ─── خط المدار ───────────────────────────────────────────────────────────────
function OrbitPath({ radius }: { radius: number }) {
  const line = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.07 });
    return new THREE.Line(geo, mat);
  }, [radius]);
  return <primitive object={line} />;
}

// ─── كواكب المجموعة الشمسية ──────────────────────────────────────────────────
function SolarSystemOverlay({
  onPlanetClick,
  frozenPlanet,
}: {
  onPlanetClick: (nameAr: string, radius: number) => void;
  frozenPlanet: string | null;
}) {
  const sunGroupRef = useRef<THREE.Group>(null);
  const sunMeshRef  = useRef<THREE.Mesh>(null);
  const mercuryRef  = useRef<THREE.Mesh>(null);
  const venusGroupRef = useRef<THREE.Group>(null);
  const venusMeshRef  = useRef<THREE.Mesh>(null);
  const moonRef     = useRef<THREE.Mesh>(null);
  const marsRef     = useRef<THREE.Mesh>(null);
  const jupiterRef  = useRef<THREE.Mesh>(null);
  const saturnGroupRef = useRef<THREE.Group>(null);
  const saturnMeshRef  = useRef<THREE.Mesh>(null);
  const uranusRef   = useRef<THREE.Mesh>(null);
  const neptuneRef  = useRef<THREE.Mesh>(null);

  const tex = useTexture({
    sun:       "/textures/sun.jpg",
    mercury:   "/textures/mercury.jpg",
    venus:     "/textures/venus_surface.jpg",
    venusAtm:  "/textures/venus_atmosphere.jpg",
    moon:      "/textures/moon.jpg",
    mars:      "/textures/mars.jpg",
    jupiter:   "/textures/jupiter.jpg",
    saturn:    "/textures/saturn.jpg",
    saturnRing:"/textures/saturn_ring_alpha.png",
    uranus:    "/textures/uranus.jpg",
    neptune:   "/textures/neptune.jpg",
  });

  useFrame((state) => {
    if (frozenPlanet) return;
    const t = state.clock.elapsedTime * 0.05;

    // الشمس تدور حول الأرض (الأرض ثابتة عند 0,0,0)
    const sunX = -Math.cos(t) * 30;
    const sunZ = -Math.sin(t) * 30;

    if (sunGroupRef.current) sunGroupRef.current.position.set(sunX, 0, sunZ);
    if (sunMeshRef.current)  sunMeshRef.current.rotation.y  += 0.003;

    // عطارد
    const mA = t * 4.1;
    if (mercuryRef.current) {
      mercuryRef.current.position.set(sunX + Math.cos(mA) * 6, 0, sunZ + Math.sin(mA) * 6);
      mercuryRef.current.rotation.y += 0.005;
    }
    // الزهرة
    const vA = t * 1.6;
    if (venusGroupRef.current) venusGroupRef.current.position.set(sunX + Math.cos(vA) * 10, 0, sunZ + Math.sin(vA) * 10);
    if (venusMeshRef.current)  venusMeshRef.current.rotation.y += 0.003;

    // القمر (يدور حول الأرض)
    const moA = t * 1.3;
    if (moonRef.current) {
      moonRef.current.position.set(Math.cos(moA) * 2.0, 0.05, Math.sin(moA) * 2.0);
      // الدوران الذاتي المتزامن (Tidal Locking): وجه القمر نفسه يواجه الأرض دائماً
      moonRef.current.lookAt(0, 0.05, 0);
    }
    // المريخ
    const maA = t * 0.53;
    if (marsRef.current) {
      marsRef.current.position.set(sunX + Math.cos(maA) * 40, 0, sunZ + Math.sin(maA) * 40);
      marsRef.current.rotation.y += 0.008;
    }
    // المشتري
    const jA = t * 0.08;
    if (jupiterRef.current) {
      jupiterRef.current.position.set(sunX + Math.cos(jA) * 58, 0, sunZ + Math.sin(jA) * 58);
      jupiterRef.current.rotation.y += 0.02;
    }
    // زحل
    const sA = t * 0.034;
    if (saturnGroupRef.current) saturnGroupRef.current.position.set(sunX + Math.cos(sA) * 76, 0, sunZ + Math.sin(sA) * 76);
    if (saturnMeshRef.current)  saturnMeshRef.current.rotation.y += 0.018;

    // أورانوس
    const uA = t * 0.012;
    if (uranusRef.current) {
      uranusRef.current.position.set(sunX + Math.cos(uA) * 94, 0, sunZ + Math.sin(uA) * 94);
      uranusRef.current.rotation.y += 0.012;
    }
    // نبتون
    const nA = t * 0.006;
    if (neptuneRef.current) {
      neptuneRef.current.position.set(sunX + Math.cos(nA) * 112, 0, sunZ + Math.sin(nA) * 112);
      neptuneRef.current.rotation.y += 0.015;
    }
  });

  return (
    <group>
      {/* ── الشمس ── */}
      <group ref={sunGroupRef}>
        <mesh ref={sunMeshRef} name="الشمس" onClick={(e) => { e.stopPropagation(); onPlanetClick("الشمس", 7.5); }}>
          <sphereGeometry args={[7.5, 64, 64]} />
          <meshBasicMaterial map={tex.sun} />
        </mesh>
        {/* هالة الشمس */}
        <mesh scale={[1.06, 1.06, 1.06]}>
          <sphereGeometry args={[7.5, 32, 32]} />
          <meshBasicMaterial color="#ff7700" transparent opacity={0.09} side={THREE.BackSide} />
        </mesh>
        <mesh scale={[1.14, 1.14, 1.14]}>
          <sphereGeometry args={[7.5, 32, 32]} />
          <meshBasicMaterial color="#ff3300" transparent opacity={0.04} side={THREE.BackSide} />
        </mesh>
        {/* ضوء الشمس */}
        <pointLight intensity={4} color="#fffaf0" distance={260} decay={0.5} />
        {/* مسارات المدارات (مركزها الشمس) */}
        <OrbitPath radius={6} />
        <OrbitPath radius={10} />
        <OrbitPath radius={30} />
        <OrbitPath radius={40} />
        <OrbitPath radius={58} />
        <OrbitPath radius={76} />
        <OrbitPath radius={94} />
        <OrbitPath radius={112} />
      </group>

      {/* ── عطارد ── */}
      <mesh ref={mercuryRef} name="عطارد" onClick={(e) => { e.stopPropagation(); onPlanetClick("عطارد", 0.55); }}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial map={tex.mercury} roughness={0.8} />
      </mesh>

      {/* ── الزهرة ── */}
      <group ref={venusGroupRef} name="الزهرة" onClick={(e) => { e.stopPropagation(); onPlanetClick("الزهرة", 1.2); }}>
        <mesh ref={venusMeshRef}>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshStandardMaterial map={tex.venus} roughness={0.7} />
        </mesh>
        <mesh scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[1.2, 32, 32]} />
          <meshStandardMaterial map={tex.venusAtm} transparent opacity={0.3} side={THREE.FrontSide} depthWrite={false} />
        </mesh>
      </group>

      {/* ── القمر (حول الأرض) ── */}
      <OrbitPath radius={2.0} />
      <mesh ref={moonRef} name="القمر" onClick={(e) => { e.stopPropagation(); onPlanetClick("القمر", 0.40); }}>
        <sphereGeometry args={[0.40, 32, 32]} />
        <meshStandardMaterial map={tex.moon} roughness={0.9} />
      </mesh>

      {/* ── المريخ ── */}
      <mesh ref={marsRef} name="المريخ" onClick={(e) => { e.stopPropagation(); onPlanetClick("المريخ", 0.72); }}>
        <sphereGeometry args={[0.72, 32, 32]} />
        <meshStandardMaterial map={tex.mars} roughness={0.8} />
      </mesh>

      {/* ── المشتري ── */}
      <mesh ref={jupiterRef} name="المشتري" onClick={(e) => { e.stopPropagation(); onPlanetClick("المشتري", 3.5); }}>
        <sphereGeometry args={[3.5, 64, 64]} />
        <meshStandardMaterial map={tex.jupiter} roughness={0.7} />
      </mesh>

      {/* ── زحل + حلقاته ── */}
      <group ref={saturnGroupRef} name="زحل" rotation={[0.47, 0, 0]} onClick={(e) => { e.stopPropagation(); onPlanetClick("زحل", 3.0); }}>
        <mesh ref={saturnMeshRef}>
          <sphereGeometry args={[3.0, 64, 64]} />
          <meshStandardMaterial map={tex.saturn} roughness={0.8} />
        </mesh>
        <SaturnRings inner={4.0} outer={7.2} texture={tex.saturnRing} />
      </group>

      {/* ── أورانوس ── */}
      <mesh ref={uranusRef} name="أورانوس" onClick={(e) => { e.stopPropagation(); onPlanetClick("أورانوس", 2.0); }}>
        <sphereGeometry args={[2.0, 64, 64]} />
        <meshStandardMaterial map={tex.uranus} roughness={0.7} />
      </mesh>

      {/* ── نبتون ── */}
      <mesh ref={neptuneRef} name="نبتون" onClick={(e) => { e.stopPropagation(); onPlanetClick("نبتون", 1.9); }}>
        <sphereGeometry args={[1.9, 64, 64]} />
        <meshStandardMaterial map={tex.neptune} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Scene({
  onRoadMapState,
  selectedPlanet,
  onPlanetClick,
  onArrived,
}: {
  onRoadMapState: (s: { active: boolean; center: { lat: number; lng: number } }) => void;
  selectedPlanet: SelectedPlanet | null;
  onPlanetClick: (nameAr: string, radius: number) => void;
  onArrived: () => void;
}) {
  const { setRotating } = useEarthStore();
  const { size } = useThree();
  const distanceMultiplier = getResponsiveDistanceMultiplier(size);
  const ctrlRef = useRef<any>(null);

  return (
    <>
      <ResponsiveCamera />
      <RoadMapZoomBridge onRoadMapState={onRoadMapState} selectedPlanet={selectedPlanet} />
      <ambientLight intensity={0.04} color="#1a2a4a" />
      <SkyBox />
      <Stars radius={600} depth={80} count={5000} factor={4} saturation={0.1} fade speed={0.3} />
      <Suspense fallback={null}><EarthSphere onEarthClick={onPlanetClick} /></Suspense>
      <Suspense fallback={null}>
        <SolarSystemOverlay
          onPlanetClick={onPlanetClick}
          frozenPlanet={selectedPlanet?.nameAr ?? null}
        />
      </Suspense>
      <FlyToCamera
        targetName={selectedPlanet?.nameAr ?? null}
        distance={(selectedPlanet?.radius ?? 1) * 6}
        onArrived={onArrived}
        ctrlRef={ctrlRef}
      />
      <OrbitControls
        ref={ctrlRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={0.3}
        maxDistance={280 * distanceMultiplier}
        zoomSpeed={0.9}
        rotateSpeed={0.5}
        panSpeed={0.5}
        autoRotate={false}
        onStart={() => setRotating(false)}
      />
    </>
  );
}

export default function Earth3D() {
  const { nightMode, setZoom, setMapActive } = useEarthStore();
  const [roadMapState, setRoadMapState] = React.useState({ active: false, center: { lat: 24, lng: 45 } });
  const [selectedPlanet, setSelectedPlanet] = useState<SelectedPlanet | null>(null);
  const [arrived, setArrived] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsSidebarCollapsed(window.innerWidth < 768);
    }
  }, []);

  React.useEffect(() => { setMapActive(roadMapState.active); }, [roadMapState.active, setMapActive]);

  const handlePlanetClick = useCallback((nameAr: string, radius: number) => {
    setSelectedPlanet({ nameAr, radius });
    setArrived(false);
  }, []);

  const handleReset = useCallback(() => {
    setSelectedPlanet(null);
    setArrived(false);
  }, []);

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 42, near: 0.1, far: 2000 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: nightMode ? 1.0 : 1.4, outputColorSpace: THREE.SRGBColorSpace }}
        shadows dpr={[1, 1.75]} resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
        style={{ background: "transparent", height: "100%", width: "100%" }}
      >
        <Scene
          onRoadMapState={setRoadMapState}
          selectedPlanet={selectedPlanet}
          onPlanetClick={handlePlanetClick}
          onArrived={() => setArrived(true)}
        />
      </Canvas>

      {/* ── قائمة الكواكب الجانبية (شريط التنقل) ── */}
      {!roadMapState.active && (isSidebarCollapsed ? (
        <button
          onClick={() => setIsSidebarCollapsed(false)}
          style={{
            position: "absolute",
            top: "50%",
            left: 16,
            transform: "translateY(-50%)",
            zIndex: 30,
            background: "rgba(10, 16, 32, 0.85)",
            backdropFilter: "blur(16px)",
            padding: "12px",
            borderRadius: "50%",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            transition: "transform 0.2s, background 0.2s",
          }}
          title="عرض كواكب المجموعة"
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-50%) scale(1.1)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(-50%) scale(1)"; }}
        >
          <span style={{ fontSize: 18 }}>🪐</span>
        </button>
      ) : (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 16,
            transform: "translateY(-50%)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "rgba(10, 16, 32, 0.8)",
            backdropFilter: "blur(20px)",
            padding: "14px 10px",
            borderRadius: 20,
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.45)",
            maxHeight: "80vh",
            overflowY: "auto",
            width: 140,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 4px" }}>
            <span style={{ color: "#a5b4fc", fontSize: 11, fontWeight: "bold", fontFamily: "'Cairo', sans-serif" }}>
              الكواكب
            </span>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              style={{
                background: "transparent",
                border: "none",
                color: "#94a3b8",
                fontSize: 10,
                cursor: "pointer",
                padding: "2px 4px",
              }}
              title="طي القائمة"
            >
              ◀ طي
            </button>
          </div>
          {PLANETS_LIST.map((planet) => {
            const isSelected = selectedPlanet?.nameAr === planet.nameAr;
            return (
              <button
                key={planet.nameEn}
                onClick={() => handlePlanetClick(planet.nameAr, planet.radius)}
                style={{
                  background: isSelected ? "rgba(99,102,241,0.22)" : "rgba(255,255,255,0.02)",
                  border: isSelected ? "1px solid rgba(129,140,248,0.45)" : "1px solid rgba(255,255,255,0.04)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  color: isSelected ? "#e0e7ff" : "#94a3b8",
                  fontSize: 12,
                  fontFamily: "'Cairo', 'Tajawal', sans-serif",
                  cursor: "pointer",
                  textAlign: "right",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "#fff";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                    e.currentTarget.style.color = "#94a3b8";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)";
                  }
                }}
              >
                <span>{planet.nameAr}</span>
                <span style={{ fontSize: 14 }}>{planet.icon}</span>
              </button>
            );
          })}
        </div>
      ))}

      {/* ── HUD: اسم الكوكب + زر الرجوع ── */}
      {!roadMapState.active && selectedPlanet && (
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 30,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            pointerEvents: "none",
          }}
        >
          {/* اسم الكوكب */}
          <div
            style={{
              background: "rgba(10,15,40,0.78)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(120,160,255,0.22)",
              borderRadius: 20,
              padding: "10px 28px",
              color: "#e8f0ff",
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
              boxShadow: "0 4px 32px rgba(60,120,255,0.18)",
              opacity: arrived ? 1 : 0.6,
              transition: "opacity 0.4s",
            }}
          >
            🪐 {selectedPlanet.nameAr}
          </div>

          {/* زر الرجوع */}
          <button
            onClick={handleReset}
            style={{
              pointerEvents: "auto",
              background: "rgba(60,100,220,0.18)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(120,160,255,0.35)",
              borderRadius: 14,
              padding: "8px 22px",
              color: "#a8c0ff",
              fontFamily: "'Cairo', 'Tajawal', sans-serif",
              fontSize: 15,
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
              letterSpacing: 0.5,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(80,130,255,0.35)";
              (e.currentTarget as HTMLButtonElement).style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(60,100,220,0.18)";
              (e.currentTarget as HTMLButtonElement).style.color = "#a8c0ff";
            }}
          >
            ← العودة للفضاء
          </button>
        </div>
      )}

      <GoogleRoadMapOverlay
        active={roadMapState.active}
        center={roadMapState.center}
        onClose={() => { setRoadMapState((s) => ({ ...s, active: false })); setZoom(2.25); }}
      />
    </div>
  );
}
