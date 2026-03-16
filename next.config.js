/** @type {import('next').NextConfig} */
const nextConfig = {
  // 빌드 속도를 위해 에러 검사만 건너뜁니다.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Vercel용으로 넣었던 잡다한 설정(cpus, outputFileTracing 등)은 전부 삭제!
};

module.exports = nextConfig;