"use client";

import dynamic from "next/dynamic";

const SolarSystem = dynamic(() => import("@/components/SolarSystem"), {
  ssr: false,
  loading: () => (
    <div
      className="w-full h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: "#010208" }}
    >
      <div
        className="w-16 h-16 rounded-full animate-spin"
        style={{
          border: "2px solid transparent",
          borderTopColor: "#ff6600",
          borderRightColor: "#ff990040",
        }}
      />
      <p style={{ color: "rgba(200,210,230,0.5)", fontSize: "0.875rem" }}>
        جارٍ تحميل المجموعة الشمسية...
      </p>
    </div>
  ),
});

export default function SolarSystemPage() {
  return (
    <main className="w-screen h-screen overflow-hidden" style={{ background: "#010208" }}>
      <SolarSystem />
    </main>
  );
}
