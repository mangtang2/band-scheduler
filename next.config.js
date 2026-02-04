/** @type {import('next').NextConfig} */
const nextConfig = {
    // 1. 깐깐한 검사 패스 (빌드 속도 UP)
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    // 2. ★ 메모리 절약 (다이어트) 설정 ★
    swcMinify: false,  // 코드 압축 끄기 (메모리 많이 먹음)
    productionBrowserSourceMaps: false, // 지도 파일 생성 끄기
    poweredByHeader: false,
    // 3. (추가) 시간 초과 방지
    staticPageGenerationTimeout: 120, 
  };
  
  module.exports = nextConfig;