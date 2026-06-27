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
