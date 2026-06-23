/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // تفعيل دعم Three.js / WebGL
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "maps.gstatic.com",
      },
    ],
  },

  // متغيرات البيئة المتاحة للـ Client
  env: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },

  webpack: (config) => {
    // دعم ملفات GLSL (شيدرات Three.js)
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/,
      use: "raw-loader",
    });
    return config;
  },
};

export default nextConfig;
