export const dynamic = 'force-dynamic'
import type { Metadata } from "next"
import "../globals.css"

export const metadata: Metadata = {
  title: "구름다리 합주공사",
  description: "멤버들의 가능 시간을 모아 최적의 연습 시간을 찾아드립니다",
}

import Script from "next/script"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Script
          src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.0/kakao.min.js"
          integrity="sha384-l+xbElFSnPZ2rOaB//wi5OO5w54sEa6u89zKA+7/4q3/01B5yE/tXq8YqFmGxg0J"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}

