/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. 에러 검사 무시
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  
    // 2. 용량 줄이기 (Standalone)
    output: 'standalone',
    productionBrowserSourceMaps: false,
  
    // 3. ★ 핵심: 싱글 스레드 모드 (메모리 폭발 방지) ★
    // 컴퓨터에게 "욕심내지 말고 코어 1개만 써서 천천히 해"라고 명령합니다.
    experimental: {
      workerThreads: false,
      cpus: 1,
    },
  };
  
  module.exports = nextConfig;