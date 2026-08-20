import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 로컬 dev 서버를 ngrok으로 외부에 공유할 때만 필요 — 기본적으로 Next.js는
  // localhost 외의 origin에서 오는 _next/static·HMR 요청을 막아서, 이게
  // 없으면 페이지는 뜨지만 클라이언트 JS가 실행되지 않아 버튼이 안 눌린다.
  allowedDevOrigins: ["*.ngrok-free.dev", "*.ngrok-free.app"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "yt3.ggpht.com" },
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
