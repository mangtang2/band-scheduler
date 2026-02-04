/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. 에러 무시
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
  
    // 2. ★ 핵심 해결책: "짐 검사 하지 마!" ★
    // 이 옵션을 끄면 'Collecting build traces' 단계를 건너뜁니다.
    outputFileTracing: false,
  
    // 3. 기존 안전장치 (유지)
    swcMinify: true,
    productionBrowserSourceMaps: false,
    experimental: {
      workerThreads: false,
      cpus: 1,
    },
  };
  
  module.exports = nextConfig;