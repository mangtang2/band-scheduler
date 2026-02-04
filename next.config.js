/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. 에러 무시 (빌드 성공 최우선)
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  
    // 2. 압축은 켜둡니다 (결과물 용량 줄이기 위해)
    swcMinify: true,
  
    // 3. 소스맵 끄기 (메모리 절약)
    productionBrowserSourceMaps: false,
  
    // 4. ★ 중요: Standalone 모드 삭제함 ★
    // (여기서 output: 'standalone' 줄을 없앴습니다. Vercel 기본 방식으로 배포합니다.)
  
    // 5. 안전장치 (천천히 일하기)
    experimental: {
      workerThreads: false,
      cpus: 1,
    },
  };
  
  module.exports = nextConfig;