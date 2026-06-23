"use client";

import React, { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { gsap } from "gsap";
import { useEarthStore } from "@/lib/store";
import { latLngToVector3 } from "@/lib/maps";
import type { EarthMarker } from "@/types";

function getResponsiveDistanceMultiplier(size: { width: number; height: number }) {
  const aspect = size.width / Math.max(size.height, 1);

  if (aspect < 0.72 || size.width < 640) return 1.55;
  if (size.width < 1024) return 1.35;
  return 1;
}

// =====================================================
// مكوّن الغلاف الجوي
// =====================================================
function Atmosphere() {
  const { showAtmosphere } = useEarthStore();
  if (!showAtmosphere) return null;

  return (
    <mesh scale={[1.05, 1.05, 1.05]}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshPhongMaterial
        color="#4fc3f7"
        transparent
        opacity={0.08}
        side={THREE.FrontSide}
        depthWrite={false}
      />
    </mesh>
  );
}

// =====================================================
// مكوّن خطوط الشبكة (Grid)
// =====================================================
function EarthGrid() {
  const { showGrid } = useEarthStore();
  if (!showGrid) return null;

  const lineObjects: THREE.Line[] = [];

  // خطوط الطول
  for (let lng = -180; lng <= 180; lng += 30) {
    const points: THREE.Vector3[] = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      const [x, y, z] = latLngToVector3(lat, lng, 1.002);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: "#38bdf8", transparent: true, opacity: 0.2 });
    lineObjects.push(new THREE.Line(geo, mat));
  }

  // خطوط العرض
  for (let lat = -60; lat <= 60; lat += 30) {
    const points: THREE.Vector3[] = [];
    for (let lng = -180; lng <= 180; lng += 5) {
      const [x, y, z] = latLngToVector3(lat, lng, 1.002);
      points.push(new THREE.Vector3(x, y, z));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: "#38bdf8", transparent: true, opacity: 0.2 });
    lineObjects.push(new THREE.Line(geo, mat));
  }

  return (
    <group>
      {lineObjects.map((line, i) => (
        <primitive key={i} object={line} />
      ))}
    </group>
  );
}

// =====================================================
// مكوّن نقطة الموقع (Marker)
// =====================================================
function LocationMarker({
  marker,
  onClick,
}: {
  marker: EarthMarker;
  onClick: (m: EarthMarker) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [x, y, z] = latLngToVector3(marker.lat, marker.lng, 1.03);

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.1 + 0.9;
      meshRef.current.scale.setScalar(pulse * (marker.size || 1));
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* النقطة الرئيسية */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(marker);
        }}
      >
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshStandardMaterial
          color={marker.color || "#f59e0b"}
          emissive={marker.color || "#f59e0b"}
          emissiveIntensity={1.5}
          roughness={0}
          metalness={0.5}
        />
      </mesh>

      {/* حلقة النبض حول النقطة */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.018, 0.025, 32]} />
        <meshBasicMaterial
          color={marker.color || "#f59e0b"}
          transparent
          opacity={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* اسم الموقع */}
      <Html
        distanceFactor={6}
        position={[0, 0.04, 0]}
        style={{ pointerEvents: "none" }}
      >
<div
className="inline-flex items-center justify-center whitespace-nowrap rounded-full border px-1 py-0.5 text-[6px] font-medium leading-none"  style={{
    background: "rgba(6,13,26,0.85)",
    color: marker.color || "#f59e0b",
    borderColor: marker.color || "#f59e0b",
    backdropFilter: "blur(4px)",
    fontFamily: "system-ui, sans-serif",
    direction: "rtl",
    transform: "scale(0.9)",
    transformOrigin: "center",
  }}
>
  {marker.name}
</div>
      </Html>
    </group>
  );
}

// =====================================================
// مكوّن كرة الأرض الرئيسية
// =====================================================
// حساب موقع الشمس الحقيقي بناءً على التوقيت العالمي
// =====================================================
function getSunPosition(): THREE.Vector3 {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  // زاوية ميل محور الأرض (تقريبي)
  const declination = (23.45 * Math.PI / 180) * Math.sin((2 * Math.PI / 365) * (dayOfYear - 81));
  // الزمن الشمسي: كل ساعة = 15 درجة
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const hourAngle = ((utcHours - 12) / 24) * 2 * Math.PI; // الشمس في الذروة عند UTC+0 ظهراً

  // تحويل إلى إحداثيات ثلاثية الأبعاد (بعيدة جداً كمصدر ضوء)
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

  const {
    isRotating,
    rotationSpeed,
    currentLat,
    currentLng,
    zoom,
    showClouds,
    nightMode,
    markers,
    selectMarker,
    selectedMarker,
  } = useEarthStore();

  const [dayTexture, setDayTexture] = React.useState<THREE.Texture | null>(null);
  const [cloudsTexture, setCloudsTexture] = React.useState<THREE.Texture | null>(null);
  const [normalTexture, setNormalTexture] = React.useState<THREE.Texture | null>(null);
  const [lightsTexture, setLightsTexture] = React.useState<THREE.Texture | null>(null);

  React.useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load("/textures/earth_day.jpeg", (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setDayTexture(t);
    }, undefined, () => setDayTexture(null));

    loader.load("/textures/earth_normal_2048.jpg", (t) => {
      setNormalTexture(t);
    }, undefined, () => setNormalTexture(null));

    loader.load("/textures/earth_clouds.png", (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setCloudsTexture(t);
    }, undefined, () => setCloudsTexture(null));

    loader.load("/textures/earth_lights_2048.png", (t) => {
      t.colorSpace = THREE.SRGBColorSpace;
      setLightsTexture(t);
    }, undefined, () => setLightsTexture(null));
  }, []);

  // تحريك الكاميرا عند تغيير الإحداثيات
  useEffect(() => {
    if (!camera) return;
    const responsiveZoom = zoom * getResponsiveDistanceMultiplier(size);
    const [tx, ty, tz] = latLngToVector3(currentLat, currentLng, responsiveZoom);
    gsap.to(camera.position, { x: tx, y: ty, z: tz, duration: 1.8, ease: "power2.inOut" });
  }, [currentLat, currentLng, zoom, camera, size.height, size.width]);

  // تحديث موقع الشمس كل ثانية + الدوران
  useFrame((_, delta) => {
    if (groupRef.current && isRotating) {
      groupRef.current.rotation.y += delta * (rotationSpeed * 0.05);
    }
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.012;
    }
    // تحديث موقع ضوء الشمس
    if (sunLightRef.current) {
      const sunPos = getSunPosition();
      sunLightRef.current.position.copy(sunPos);
    }
  });

  const normalScaleVec = React.useMemo(() => new THREE.Vector2(0.4, 0.4), []);
  const sunPos = React.useMemo(() => getSunPosition(), []);

  return (
    <group ref={groupRef}>
      {/* ضوء الشمس الحقيقي - يتحرك حسب التوقيت العالمي */}
      <directionalLight
        ref={sunLightRef}
        position={sunPos}
        intensity={0.7}
        color="#4f51d1a8"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* كرة الأرض - texture النهاري دائماً، الإضاءة تحدد الليل/النهار */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[1, 128, 128]} />
        {dayTexture ? (
<meshBasicMaterial map={dayTexture} />
        ) : (
          <meshStandardMaterial color="#2a7fc4" roughness={0.8} metalness={0.0} />
        )}
      </mesh>

      {/* طبقة أضواء المدن الليلية - تظهر في الجهة المظلمة */}
      {lightsTexture && (
        <mesh scale={[1.001, 1.001, 1.001]}>
          <sphereGeometry args={[1, 128, 128]} />
          <meshBasicMaterial
            map={lightsTexture}
            transparent
            opacity={nightMode ? 0.85 : 0.55}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* طبقة السحاب */}
      {showClouds && (
        <mesh ref={cloudsRef} scale={[1.008, 1.008, 1.008]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial
            map={cloudsTexture ?? undefined}
            transparent
            opacity={cloudsTexture ? 0.35 : 0.15}
            depthWrite={false}
            roughness={1}
            metalness={0}
          />
        </mesh>
      )}

      {/* الغلاف الجوي */}
      <Atmosphere />

      {/* خطوط الشبكة */}
      <EarthGrid />

      {/* نقاط المواقع */}
      {markers.map((marker: EarthMarker) => (
        <LocationMarker
          key={marker.id}
          marker={marker}
          onClick={(m) => {
            selectMarker(selectedMarker?.id === m.id ? null : m);
          }}
        />
      ))}
    </group>
  );
}

// =====================================================
// المكوّن الرئيسي للمشهد
// =====================================================
function SkyBox() {
  const [starsTexture, setStarsTexture] = React.useState<THREE.Texture | null>(null);

  React.useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      "/textures/2k_stars_milky_way.jpg",
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        setStarsTexture(t);
      },
      undefined,
      () => setStarsTexture(null)
    );
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
    const nextFov = isPhone ? 52 : isTablet ? 46 : 42;
    const nextDistance = 2.5 * getResponsiveDistanceMultiplier(size);
    const currentDistance = camera.position.length();

    camera.fov = nextFov;

    if (Math.abs(currentDistance - 2.5) < 0.08) {
      camera.position.setLength(nextDistance);
    }

    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

function Scene() {
  const { setRotating } = useEarthStore();
  const { size } = useThree();
  const distanceMultiplier = getResponsiveDistanceMultiplier(size);

  return (
    <>
      <ResponsiveCamera />

      {/* إضاءة بيئية خافتة جداً - ضوء الشمس الحقيقي داخل EarthSphere */}
      <ambientLight intensity={0.04} color="#1a2a4a" />
      {/* انعكاس خفيف من الفضاء */}
      <pointLight position={[-8, -4, -8]} intensity={0.06} color="#0a1530" />

      {/* النجوم والخلفية الفلكية الفاخرة */}
      <SkyBox />
      <Stars
        radius={300}
        depth={60}
        count={2000}
        factor={3}
        saturation={0.5}
        fade
        speed={0.3}
      />

      {/* الكرة الأرضية */}
      <Suspense fallback={null}>
        <EarthSphere />
      </Suspense>

      {/* تحكم الكاميرا */}
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={1.45 * distanceMultiplier}
        maxDistance={8 * distanceMultiplier}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        autoRotate={false}
        onStart={() => setRotating(false)}
      />
    </>
  );
}

// =====================================================
// المكوّن الخارجي (Canvas)
// =====================================================
export default function Earth3D() {
  const { nightMode } = useEarthStore();
  return (
    <Canvas
      camera={{ position: [0, 0, 2.5], fov: 42, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: nightMode ? 1.0 : 1.4,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      shadows
      dpr={[1, 1.75]}
      resize={{ scroll: false, debounce: { scroll: 50, resize: 0 } }}
      style={{ background: "transparent", height: "100%", width: "100%" }}
    >
      <Scene />
    </Canvas>
  );
}
