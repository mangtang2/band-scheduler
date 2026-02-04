import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "../globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "밴드 연습 일정 조율",
  description: "멤버들의 가능 시간을 모아 최적의 연습 시간을 찾아드립니다",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  )
}

