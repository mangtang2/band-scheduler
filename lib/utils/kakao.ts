declare global {
  interface Window {
    Kakao: any
  }
}

export function initKakao() {
  if (typeof window === "undefined") return false
  if (!window.Kakao) return false
  if (!window.Kakao.isInitialized()) {
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
    if (!key) {
      console.warn("Kakao JS Key is missing")
      return false
    }
    window.Kakao.init(key)
  }
  return true
}

export function shareKakaoToInput(roomId: string, roomName: string) {
  if (!initKakao()) return

  const url = `${window.location.origin}/room/${roomId}`

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: "연습 일정 조율을 시작합니다!",
      description: `[${roomName}] 방에 아직 가능한 시간을 입력하지 않은 멤버가 있다면, 빠르게 들어와서 시간을 체크해주세요!`,
      imageUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop", // 기본 밴드 이미지
      link: {
        mobileWebUrl: url,
        webUrl: url,
      },
    },
    buttons: [
      {
        title: "⏰ 내 시간 입력하러 가기",
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
    ],
  })
}

export function shareKakaoResult(roomId: string, roomName: string, dateStr: string, timeStr: string) {
  if (!initKakao()) return

  const url = `${window.location.origin}/room/${roomId}/results`

  window.Kakao.Share.sendDefault({
    objectType: "feed",
    content: {
      title: "🎉 합주 일정이 확정되었습니다!",
      description: `[${roomName}] 합주 일정: ${dateStr} ${timeStr}\n늦지 않게 모여주세요!`,
      imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=800&auto=format&fit=crop", // 기쁜 분위기의 이미지
      link: {
        mobileWebUrl: url,
        webUrl: url,
      },
    },
    buttons: [
      {
        title: "📅 결과 자세히 보기",
        link: {
          mobileWebUrl: url,
          webUrl: url,
        },
      },
    ],
  })
}
