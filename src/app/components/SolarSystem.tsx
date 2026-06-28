"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
  Suspense,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useTexture, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

type OrbitControlsImpl = any;
// ─────────────────────────────────────────────────────────────────────────────
// Proportional planet data
// Sizes are scaled down from real ratios:  Sun radius ≈ 109× Earth
// We use Sun = 5 units, Earth = 1 unit as reference
// Orbit radii are compressed logarithmically so all fit in one scene
// ─────────────────────────────────────────────────────────────────────────────
export interface PlanetDef {
  id: string;
  name: string;
  nameAr: string;
  emoji: string;
  /** visual radius in Three.js units */
  radius: number;
  /** orbit radius from sun in Three.js units */
  orbitRadius: number;
  /** radians/sec orbit speed (sped up for visuals) */
  orbitSpeed: number;
  /** self-rotation speed multiplier */
  rotSpeed: number;
  /** axial tilt in radians */
  tilt: number;
  /** initial orbit angle */
  angle0: number;
  texture: string;
  atmosphereTex?: string;
  ring?: { inner: number; outer: number; tex: string };
  color: string;
  facts: string[];
}

/* Real relative radii (Earth = 1):
   Mercury 0.38 | Venus 0.95 | Earth 1 | Mars 0.53
   Jupiter 11.2 | Saturn 9.45 | Uranus 4.0 | Neptune 3.88
   Sun 109
   We scale so Earth = 0.9, Sun = 5.5 */
const S = 0.9; // Earth scale
const PLANETS: PlanetDef[] = [
  {
    id: "mercury",
    name: "Mercury",
    nameAr: "عطارد",
    emoji: "⚫",
    radius: S * 0.38,
    orbitRadius: 10,
    orbitSpeed: 0.058,
    rotSpeed: 0.003,
    tilt: 0.034,
    angle0: 0.4,
    texture: "/textures/mercury.jpg",
    color: "#b5b5b5",
    facts: [
      "أقرب كوكب للشمس",
      "يومه أطول من سنته",
      "لا يوجد غلاف جوي",
      "درجة حرارة: -180 إلى +430 °م",
    ],
  },
  {
    id: "venus",
    name: "Venus",
    nameAr: "الزهرة",
    emoji: "🟡",
    radius: S * 0.95,
    orbitRadius: 16,
    orbitSpeed: 0.022,
    rotSpeed: -0.001, // retrograde
    tilt: 3.09,
    angle0: 1.7,
    texture: "/textures/venus_surface.jpg",
    atmosphereTex: "/textures/venus_atmosphere.jpg",
    color: "#e8c97e",
    facts: [
      "أشد الكواكب حرارةً (462°م)",
      "يدور عكس الشمس",
      "الغلاف الجوي من ثاني أكسيد الكربون",
      "أكثر الكواكب لمعاناً من الأرض",
    ],
  },
  {
    id: "earth",
    name: "Earth",
    nameAr: "الأرض",
    emoji: "🌍",
    radius: S * 1.0,
    orbitRadius: 22,
    orbitSpeed: 0.014,
    rotSpeed: 0.01,
    tilt: 0.41,
    angle0: 0.0,
    texture: "/textures/earth_day.jpg",
    color: "#4fa3e0",
    facts: [
      "كوكبنا الجميل",
      "الكوكب الوحيد المعروف بالحياة",
      "71% من سطحه ماء",
      "له قمر واحد طبيعي",
    ],
  },
  {
    id: "mars",
    name: "Mars",
    nameAr: "المريخ",
    emoji: "🔴",
    radius: S * 0.53,
    orbitRadius: 30,
    orbitSpeed: 0.008,
    rotSpeed: 0.009,
    tilt: 0.44,
    angle0: 3.1,
    texture: "/textures/mars.jpg",
    color: "#c1440e",
    facts: [
      "الكوكب الأحمر",
      "يحتوي على أعلى بركان في النظام الشمسي",
      "له قمران: فوبوس وديموس",
      "مدة يومه تشبه الأرض: 24.6 ساعة",
    ],
  },
  {
    id: "jupiter",
    name: "Jupiter",
    nameAr: "المشتري",
    emoji: "🟠",
    radius: S * 4.2,
    orbitRadius: 52,
    orbitSpeed: 0.0025,
    rotSpeed: 0.022,
    tilt: 0.054,
    angle0: 0.9,
    texture: "/textures/jupiter.jpg",
    color: "#c88b3a",
    facts: [
      "أضخم كواكب المجموعة الشمسية",
      "العاصفة الحمراء الكبرى: عاصفة دائمة منذ قرون",
      "له 95 قمراً معروفاً",
      "كتلته 2.5× كتلة باقي الكواكب مجتمعة",
    ],
  },
  {
    id: "saturn",
    name: "Saturn",
    nameAr: "زحل",
    emoji: "🪐",
    radius: S * 3.6,
    orbitRadius: 72,
    orbitSpeed: 0.0015,
    rotSpeed: 0.019,
    tilt: 0.47,
    angle0: 2.3,
    texture: "/textures/saturn.jpg",
    ring: {
      inner: S * 4.5,
      outer: S * 8.5,
      tex: "/textures/saturn_ring_alpha.png",
    },
    color: "#e4d191",
    facts: [
      "كوكب الحلقات الرائع",
      "أخف كثافةً من الماء",
      "حلقاته مؤلفة من جليد وصخور",
      "له 146 قمراً معروفاً",
    ],
  },
  {
    id: "uranus",
    name: "Uranus",
    nameAr: "أورانوس",
    emoji: "🔵",
    radius: S * 1.6,
    orbitRadius: 92,
    orbitSpeed: 0.0008,
    rotSpeed: -0.013, // retrograde
    tilt: 1.71,
    angle0: 4.1,
    texture: "/textures/uranus.jpg",
    color: "#7de8e8",
    facts: [
      "يدور على جانبه (ميل 98°)",
      "أبرد كوكب رغم أنه ليس الأبعد",
      "له 27 قمراً معروفاً",
      "يُصنَّف عملاقاً جليدياً",
    ],
  },
  {
    id: "neptune",
    name: "Neptune",
    nameAr: "نبتون",
    emoji: "🔵",
    radius: S * 1.55,
    orbitRadius: 110,
    orbitSpeed: 0.0004,
    rotSpeed: 0.015,
    tilt: 0.49,
    angle0: 5.5,
    texture: "/textures/neptune.jpg",
    color: "#4b70dd",
    facts: [
      "أبعد الكواكب الكبيرة",
      "رياحه الأسرع في المجموعة الشمسية (2100 كم/ساعة)",
      "له 16 قمراً معروفاً",
      "اكتُشف بالرياضيات قبل الرصد",
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helper: easing
// ─────────────────────────────────────────────────────────────────────────────
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// ─────────────────────────────────────────────────────────────────────────────
// Orbit line
// ─────────────────────────────────────────────────────────────────────────────
function OrbitLine({ radius }: { radius: number }) {
  const pts = useMemo(() => {
    const arr: THREE.Vector3[] = [];
    for (let i = 0; i <= 256; i++) {
      const a = (i / 256) * Math.PI * 2;
      arr.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return arr;
  }, [radius]);

  const lineMesh = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: "#5599ff",
      transparent: true,
      opacity: 0.07,
    });
    return new THREE.Line(geo, mat);
  }, [pts]);

  return <primitive object={lineMesh} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Saturn ring mesh
// ─────────────────────────────────────────────────────────────────────────────
function SaturnRing({ inner, outer, tex }: { inner: number; outer: number; tex: string }) {
  const texture = useTexture(tex);
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(inner, outer, 128, 4);
    // Fix UVs so texture maps radially
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const r = v.length();
      const normalized = (r - inner) / (outer - inner);
      uv.setXY(i, normalized, 1);
    }
    uv.needsUpdate = true;
    return g;
  }, [inner, outer]);

  return (
    <mesh geometry={geo} rotation={[-Math.PI / 2, 0, 0]}>
      <meshBasicMaterial
        map={texture}
        side={THREE.DoubleSide}
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Individual planet
// ─────────────────────────────────────────────────────────────────────────────
interface PlanetMeshProps {
  def: PlanetDef;
  onPick: (def: PlanetDef, worldPos: THREE.Vector3) => void;
  selected: boolean;
  frozen: boolean; // stop orbiting when in detail mode
}

function PlanetMesh({ def, onPick, selected, frozen }: PlanetMeshProps) {
  const orbitRef = useRef<THREE.Group>(null!); // orbit pivot
  const tiltRef = useRef<THREE.Group>(null!);  // axial tilt
  const spinRef = useRef<THREE.Mesh>(null!);   // self rotation
  const [hovered, setHovered] = useState(false);
  const angleRef = useRef(def.angle0);

  // Load textures
  const texPaths = useMemo(
    () => (def.atmosphereTex ? [def.texture, def.atmosphereTex] : [def.texture]),
    [def.texture, def.atmosphereTex]
  );
  const textures = useTexture(texPaths);
  const mainTex = textures[0];
  const atmTex = def.atmosphereTex ? (textures[1] as THREE.Texture) : null;

  useFrame((_, dt) => {
    // Orbit around sun
    if (!frozen) {
      angleRef.current += def.orbitSpeed * dt;
      orbitRef.current.position.set(
        Math.cos(angleRef.current) * def.orbitRadius,
        0,
        Math.sin(angleRef.current) * def.orbitRadius
      );
    }
    // Self rotation
    spinRef.current.rotation.y += def.rotSpeed * dt * 60;
  });

  const handleClick = useCallback(
    (e: { stopPropagation: () => void }) => {
      e.stopPropagation();
      const wp = new THREE.Vector3();
      orbitRef.current.getWorldPosition(wp);
      onPick(def, wp);
    },
    [def, onPick]
  );

  const glowScale = 1 + (selected ? 0.18 : hovered ? 0.1 : 0);

  return (
    <group ref={orbitRef}>
      {/* Axial tilt wrapper */}
      <group ref={tiltRef} rotation={[def.tilt, 0, 0]}>
        {/* Planet sphere */}
        <mesh
          ref={spinRef}
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
            document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            setHovered(false);
            document.body.style.cursor = "default";
          }}
          castShadow
          receiveShadow
        >
          <sphereGeometry args={[def.radius, 64, 64]} />
          <meshStandardMaterial
            map={mainTex}
            roughness={0.85}
            metalness={0.0}
            emissive={selected ? new THREE.Color(def.color) : new THREE.Color(0x000000)}
            emissiveIntensity={selected ? 0.12 : 0}
          />
        </mesh>

        {/* Venus atmosphere layer */}
        {atmTex && (
          <mesh scale={[1.025, 1.025, 1.025]}>
            <sphereGeometry args={[def.radius, 32, 32]} />
            <meshStandardMaterial
              map={atmTex}
              transparent
              opacity={0.4}
              side={THREE.FrontSide}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Selection / hover glow */}
        <mesh scale={[glowScale, glowScale, glowScale]}>
          <sphereGeometry args={[def.radius, 24, 24]} />
          <meshBasicMaterial
            color={def.color}
            transparent
            opacity={(selected || hovered) ? 0.14 : 0}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Saturn rings */}
        {def.ring && (
          <SaturnRing
            inner={def.ring.inner}
            outer={def.ring.outer}
            tex={def.ring.tex}
          />
        )}

        {/* Floating label */}
        {(hovered || selected) && (
          <Text
            position={[0, def.radius + (def.ring ? def.ring.outer * 0.6 : 0.8), 0]}
            fontSize={Math.max(0.55, def.radius * 0.45)}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineColor="#000000"
            outlineWidth={0.04}
          >
            {def.nameAr}
          </Text>
        )}
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sun
// ─────────────────────────────────────────────────────────────────────────────
function SunMesh({ onPick }: { onPick: (pos: THREE.Vector3) => void }) {
  const tex = useTexture("/textures/sun.jpg");
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((_, dt) => {
    meshRef.current.rotation.y += 0.003 * dt * 60;
  });

  return (
    <group>
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onPick(new THREE.Vector3(0, 0, 0)); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "default"; }}
      >
        <sphereGeometry args={[5.5, 64, 64]} />
        <meshStandardMaterial
          map={tex}
          emissiveMap={tex}
          emissive={new THREE.Color("#ff5500")}
          emissiveIntensity={1.4}
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* Glow halos */}
      <mesh scale={[1.07, 1.07, 1.07]}>
        <sphereGeometry args={[5.5, 32, 32]} />
        <meshBasicMaterial color="#ff7700" transparent opacity={0.09} side={THREE.BackSide} />
      </mesh>
      <mesh scale={[1.16, 1.16, 1.16]}>
        <sphereGeometry args={[5.5, 32, 32]} />
        <meshBasicMaterial color="#ff3300" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>
      <mesh scale={[1.28, 1.28, 1.28]}>
        <sphereGeometry args={[5.5, 32, 32]} />
        <meshBasicMaterial color="#ff2200" transparent opacity={0.02} side={THREE.BackSide} />
      </mesh>

      {/* Sun hover label */}
      {hovered && (
        <Text position={[0, 7.5, 0]} fontSize={1.1} color="white" anchorX="center" anchorY="middle" outlineColor="#000" outlineWidth={0.05}>
          الشمس
        </Text>
      )}

      {/* The actual light source */}
      <pointLight
        intensity={6}
        color="#fff5cc"
        distance={350}
        decay={0.6}
        castShadow
      />
    </group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera fly-to controller
// ─────────────────────────────────────────────────────────────────────────────
interface FlyToProps {
  target: THREE.Vector3 | null;
  zoomDist: number;
  onArrived: () => void;
  ctrlRef: React.RefObject<OrbitControlsImpl | null>;
}

function FlyToController({ target, zoomDist, onArrived, ctrlRef }: FlyToProps) {
  const { camera } = useThree();
  const flying = useRef(false);
  const done = useRef(false);
  const t = useRef(0);
  const startCam = useRef(new THREE.Vector3());
  const endCam = useRef(new THREE.Vector3());
  const startPivot = useRef(new THREE.Vector3());
  const endPivot = useRef(new THREE.Vector3());

  useEffect(() => {
    if (!target) return;
    flying.current = true;
    done.current = false;
    t.current = 0;
    startCam.current.copy(camera.position);
    startPivot.current.copy(ctrlRef.current?.target ?? new THREE.Vector3());

    // Camera placed at planet + offset pointing away from sun
    const dir = target.length() < 0.01
      ? new THREE.Vector3(0, 0.5, 1).normalize()
      : target.clone().normalize();
    endCam.current.copy(target).addScaledVector(dir, zoomDist);
    endCam.current.y += zoomDist * 0.3;
    endPivot.current.copy(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useFrame((_, dt) => {
    if (!flying.current) return;
    t.current = Math.min(t.current + dt * 0.65, 1);
    const e = easeInOutCubic(t.current);
    camera.position.lerpVectors(startCam.current, endCam.current, e);
    if (ctrlRef.current) {
      ctrlRef.current.target.lerpVectors(startPivot.current, endPivot.current, e);
      ctrlRef.current.update();
    }
    if (t.current >= 1 && !done.current) {
      done.current = true;
      flying.current = false;
      onArrived();
    }
  });

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full 3-D Scene
// ─────────────────────────────────────────────────────────────────────────────
interface SceneProps {
  flyTarget: THREE.Vector3 | null;
  flyZoom: number;
  frozen: boolean;
  activePlanet: PlanetDef | null;
  onPlanetPick: (def: PlanetDef, wp: THREE.Vector3) => void;
  onSunPick: (wp: THREE.Vector3) => void;
  onArrived: () => void;
  ctrlRef: React.RefObject<OrbitControlsImpl | null>;
}

function Scene({
  flyTarget,
  flyZoom,
  frozen,
  activePlanet,
  onPlanetPick,
  onSunPick,
  onArrived,
  ctrlRef,
}: SceneProps) {
  return (
    <>
      <ambientLight intensity={0.04} />

      {/* Milky-way style star field */}
      <Stars radius={500} depth={80} count={9000} factor={5} saturation={0.1} fade speed={0.3} />

      {/* Sun */}
      <Suspense fallback={null}>
        <SunMesh onPick={onSunPick} />
      </Suspense>

      {/* Orbit rings */}
      {PLANETS.map((p) => (
        <OrbitLine key={`orbit-${p.id}`} radius={p.orbitRadius} />
      ))}

      {/* Planets */}
      <Suspense fallback={null}>
        {PLANETS.map((p) => (
          <PlanetMesh
            key={p.id}
            def={p}
            onPick={onPlanetPick}
            selected={activePlanet?.id === p.id}
            frozen={frozen}
          />
        ))}
      </Suspense>

      {/* Camera animator */}
      <FlyToController
        target={flyTarget}
        zoomDist={flyZoom}
        onArrived={onArrived}
        ctrlRef={ctrlRef}
      />

      {/* Orbit controls */}
      <OrbitControls
        ref={ctrlRef as any}
        enableDamping
        dampingFactor={0.055}
        minDistance={2}
        maxDistance={220}
        enablePan
        panSpeed={0.4}
        rotateSpeed={0.45}
        zoomSpeed={0.9}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Planet Info Card (detail view)
// ─────────────────────────────────────────────────────────────────────────────
function PlanetCard({
  planet,
  onBack,
}: {
  planet: PlanetDef | "sun";
  onBack: () => void;
}) {
  const isSun = planet === "sun";
  const p = isSun ? null : (planet as PlanetDef);
  const color = isSun ? "#ff8800" : p!.color;
  const nameAr = isSun ? "الشمس" : p!.nameAr;
  const nameEn = isSun ? "Sun" : p!.name;
  const facts = isSun
    ? [
        "نجمنا الذي يضيء مجموعتنا الشمسية",
        "قطره أكبر 109 مرة من قطر الأرض",
        "تبلغ حرارة سطحه 5,500 °م",
        "تُشكّل كتلته 99.86% من المجموعة الشمسية",
      ]
    : p!.facts;

  return (
    <motion.div
      key={nameEn}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[min(30rem,calc(100vw-2rem))]"
    >
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(4,10,22,0.92)",
          backdropFilter: "blur(24px)",
          border: `1px solid ${color}35`,
          boxShadow: `0 0 60px ${color}18, 0 12px 40px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Header strip */}
        <div
          className="px-5 py-3 flex items-center gap-3"
          style={{
            background: `linear-gradient(90deg, ${color}22 0%, transparent 100%)`,
            borderBottom: `1px solid ${color}20`,
          }}
        >
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ background: color, boxShadow: `0 0 14px ${color}` }}
          />
          <div className="flex-1">
            <h2 className="text-white font-bold text-lg leading-none tracking-wide">
              {nameAr}
            </h2>
            <span className="text-xs font-mono" style={{ color: `${color}aa` }}>
              {nameEn}
            </span>
          </div>
          <button
            onClick={onBack}
            className="text-xs px-3 py-1.5 rounded-lg transition-all hover:scale-105 active:scale-95 flex-shrink-0"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(200,210,230,0.7)",
            }}
          >
            ← رجوع
          </button>
        </div>

        {/* Facts */}
        <div className="px-5 py-4 space-y-2" style={{ direction: "rtl" }}>
          {facts.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div
                className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                style={{ background: color }}
              />
              <p className="text-sm leading-relaxed" style={{ color: "rgba(200,215,235,0.82)" }}>
                {f}
              </p>
            </div>
          ))}
        </div>

        {/* Tips */}
        <div
          className="px-5 py-2.5 flex gap-3 flex-wrap"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            direction: "rtl",
          }}
        >
          {["🖱️ اسحب للتدوير", "🔍 عجلة للتكبير / تصغير"].map((t) => (
            <span
              key={t}
              className="text-xs px-2 py-1 rounded-md"
              style={{
                background: `${color}12`,
                color: `${color}cc`,
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom planet bar
// ─────────────────────────────────────────────────────────────────────────────
function PlanetBar({
  active,
  onSelect,
}: {
  active: string | null;
  onSelect: (def: PlanetDef) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ duration: 0.45, delay: 0.2 }}
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex gap-1.5 px-3 py-2.5 rounded-2xl"
      style={{
        background: "rgba(4,10,22,0.82)",
        backdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.07)",
        maxWidth: "calc(100vw - 2rem)",
        overflowX: "auto",
        scrollbarWidth: "none",
      }}
    >
      {PLANETS.map((p) => {
        const isActive = active === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p)}
            title={p.nameAr}
            className="flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
            style={{
              background: isActive ? `${p.color}1e` : "transparent",
              border: `1px solid ${isActive ? `${p.color}55` : "transparent"}`,
            }}
          >
            {/* Size-proportional dot */}
            <div
              className="rounded-full"
              style={{
                width: Math.max(6, Math.min(16, p.radius * 4)) + "px",
                height: Math.max(6, Math.min(16, p.radius * 4)) + "px",
                background: p.color,
                boxShadow: isActive ? `0 0 10px ${p.color}` : "none",
                transition: "box-shadow 0.2s",
              }}
            />
            <span
              className="text-[9px] font-medium whitespace-nowrap"
              style={{ color: isActive ? p.color : "rgba(180,200,230,0.45)" }}
            >
              {p.nameAr}
            </span>
          </button>
        );
      })}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Header
// ─────────────────────────────────────────────────────────────────────────────
function Header({ onReset }: { onReset: () => void }) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-5 pt-4 pb-6"
      style={{
        background:
          "linear-gradient(to bottom, rgba(2,5,14,0.95) 0%, transparent 100%)",
        pointerEvents: "none",
      }}
    >
      <div className="flex items-center gap-3" style={{ pointerEvents: "auto" }}>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{
            background: "linear-gradient(135deg, #ff6600 0%, #ff9900 100%)",
            boxShadow: "0 0 24px rgba(255,110,0,0.55)",
          }}
        >
          ☀️
        </div>
        <div>
          <h1
            className="text-white font-bold text-base leading-none"
            style={{ direction: "rtl" }}
          >
            المجموعة الشمسية
          </h1>
          <p className="text-xs mt-0.5 font-mono" style={{ color: "rgba(160,180,220,0.45)" }}>
            Solar System 3D Explorer
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ pointerEvents: "auto" }}>
        <Link
          href="/earth"
          className="text-xs px-3.5 py-2 rounded-xl transition-all hover:scale-105 active:scale-95 text-decoration-none"
          style={{
            background: "rgba(56,189,248,0.15)",
            border: "1px solid rgba(56,189,248,0.3)",
            color: "rgba(14,165,233,0.9)",
          }}
        >
          🌍 خريطة الأرض 3D
        </Link>
        <button
          onClick={onReset}
          className="text-xs px-3.5 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(190,210,240,0.7)",
          }}
        >
          🌌 عرض كامل
        </button>
      </div>
    </motion.header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Intro hint (auto-hides)
// ─────────────────────────────────────────────────────────────────────────────
function Hint() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(id);
  }, []);
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div
            className="inline-flex gap-4 px-5 py-2.5 rounded-full text-xs whitespace-nowrap"
            style={{
              background: "rgba(4,10,22,0.78)",
              backdropFilter: "blur(14px)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(180,200,230,0.6)",
              direction: "rtl",
            }}
          >
            <span>🖱️ اسحب للتدوير</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>🔍 عجلة للتكبير</span>
            <span style={{ opacity: 0.3 }}>·</span>
            <span>🪐 انقر كوكباً للانتقال إليه</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component
// ─────────────────────────────────────────────────────────────────────────────
export default function SolarSystem() {
  const ctrlRef = useRef<OrbitControlsImpl | null>(null);

  // null = overview | PlanetDef = planet selected | "sun" = sun selected
  const [active, setActive] = useState<PlanetDef | "sun" | null>(null);
  const [flyTarget, setFlyTarget] = useState<THREE.Vector3 | null>(null);
  const [flyZoom, setFlyZoom] = useState(8);
  const [arrived, setArrived] = useState(false);

  // Pick a planet from 3D canvas
  const handlePlanetPick = useCallback((def: PlanetDef, wp: THREE.Vector3) => {
    setActive(def);
    setFlyTarget(wp.clone());
    setFlyZoom(def.radius * 5.5 + (def.ring ? def.ring.outer * 1.2 : 0));
    setArrived(false);
  }, []);

  // Pick from bottom bar
  const handleBarPick = useCallback((def: PlanetDef) => {
    const ang = def.angle0;
    const wp = new THREE.Vector3(
      Math.cos(ang) * def.orbitRadius,
      0,
      Math.sin(ang) * def.orbitRadius
    );
    setActive(def);
    setFlyTarget(wp);
    setFlyZoom(def.radius * 5.5 + (def.ring ? def.ring.outer * 1.2 : 0));
    setArrived(false);
  }, []);

  // Pick sun
  const handleSunPick = useCallback((wp: THREE.Vector3) => {
    setActive("sun");
    setFlyTarget(wp.clone());
    setFlyZoom(18);
    setArrived(false);
  }, []);

  const handleArrived = useCallback(() => setArrived(true), []);

  const handleReset = useCallback(() => {
    setActive(null);
    setFlyTarget(null);
    setArrived(false);
    if (ctrlRef.current) {
      ctrlRef.current.target.set(0, 0, 0);
    }
  }, []);

  const activeId = active === "sun" ? "sun" : (active as PlanetDef | null)?.id ?? null;

  return (
    <div className="relative w-full h-full" style={{ background: "#010208" }}>
      {/* ── Three.js Canvas ── */}
      <Canvas
        camera={{ position: [0, 55, 130], fov: 52, near: 0.5, far: 1200 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.85,
        }}
        shadows
      >
        <Scene
          flyTarget={flyTarget}
          flyZoom={flyZoom}
          frozen={arrived}
          activePlanet={active === "sun" ? null : (active as PlanetDef | null)}
          onPlanetPick={handlePlanetPick}
          onSunPick={handleSunPick}
          onArrived={handleArrived}
          ctrlRef={ctrlRef}
        />
      </Canvas>

      {/* ── Header ── */}
      <Header onReset={handleReset} />

      {/* ── Hint ── */}
      <Hint />

      {/* ── Bottom planet bar (overview) ── */}
      <AnimatePresence>
        {!arrived && (
          <PlanetBar active={activeId} onSelect={handleBarPick} />
        )}
      </AnimatePresence>

      {/* ── Planet / Sun info card ── */}
      <AnimatePresence>
        {arrived && active && (
          <PlanetCard planet={active} onBack={handleReset} />
        )}
      </AnimatePresence>
    </div>
  );
}
