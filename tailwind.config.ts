import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // لوحة ألوان الفضاء
        space: {
          950: "#020408",
          900: "#060d1a",
          800: "#0a1628",
          700: "#0f2040",
          600: "#152b58",
        },
        // ألوان الكوكب
        ocean: {
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
        },
        // ألوان الأرض
        land: {
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
        },
        // لون الغلاف الجوي
        atmosphere: {
          300: "#a5f3fc",
          400: "#67e8f9",
          500: "#22d3ee",
        },
        // لون التمييز
        glow: {
          400: "#f59e0b",
          500: "#f97316",
        },
      },
      fontFamily: {
        // خط رئيسي حديث
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        // خط عرض للعناوين
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        // خط للأرقام والبيانات
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        // تدرجات الفضاء
        "space-gradient":
          "radial-gradient(ellipse at center, #0f2040 0%, #060d1a 50%, #020408 100%)",
        "glow-gradient":
          "radial-gradient(ellipse at center, rgba(56,189,248,0.15) 0%, transparent 70%)",
        "star-field":
          "radial-gradient(1px 1px at 20% 30%, white 0%, transparent 100%), radial-gradient(1px 1px at 80% 70%, white 0%, transparent 100%)",
      },
      animation: {
        "spin-slow": "spin 20s linear infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "float-up": "floatUp 0.6s ease-out forwards",
        shimmer: "shimmer 2s linear infinite",
        "orbit-ring": "orbitRing 8s linear infinite",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow: "0 0 20px rgba(56,189,248,0.3)",
          },
          "50%": {
            boxShadow:
              "0 0 40px rgba(56,189,248,0.6), 0 0 80px rgba(56,189,248,0.2)",
          },
        },
        floatUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        orbitRing: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      boxShadow: {
        glow: "0 0 30px rgba(56,189,248,0.4)",
        "glow-lg": "0 0 60px rgba(56,189,248,0.3), 0 0 120px rgba(56,189,248,0.1)",
        "inner-glow": "inset 0 0 30px rgba(56,189,248,0.1)",
        planet: "0 0 80px rgba(14,165,233,0.5), 0 0 160px rgba(14,165,233,0.2)",
      },
      backdropBlur: {
        xs: "2px",
      },
      borderColor: {
        glow: "rgba(56,189,248,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;