'use client';

import { useEffect, useRef } from 'react';

export default function KakaoAdFit() {
  const scriptElementWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 중복 로드 방지 (React 렌더링 특성상 스크립트가 두 번 붙는 것 방지)
    const scriptId = 'kakao-adfit-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;

    if (scriptElementWrapper.current) {
      scriptElementWrapper.current.appendChild(script);
    }
  }, []);

  return (
    // 광고가 로드되기 전에도 화면이 덜컹거리지 않게 최소 크기(250x250)를 잡아줍니다.
    <div 
      ref={scriptElementWrapper} 
      className="flex justify-center items-center min-w-[250px] min-h-[250px] bg-gray-50"
    >
      <ins
        className="kakao_ad_area"
        style={{ display: 'none' }}
        data-ad-unit="DAN-ks3Mg1aOHToNvs1w"
        data-ad-width="250"
        data-ad-height="250"
      ></ins>
    </div>
  );
}