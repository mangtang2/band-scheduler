import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Calendar, Users, Music } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            밴드 연습 일정 조율
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            멤버들의 가능 시간을 모아서 최적의 연습 시간을 자동으로 찾아드립니다
          </p>
          <Link href="/create-room">
            <Button size="lg" className="text-lg px-8 py-6">
              새 방 만들기
            </Button>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">간편한 시간 선택</h3>
            <p className="text-muted-foreground">
              드래그만으로 가능한 시간대를 빠르게 입력할 수 있습니다
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">멤버별 관리</h3>
            <p className="text-muted-foreground">
              곡마다 필요한 멤버를 지정하고 최적의 시간을 찾습니다
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Music className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">곡별 추천</h3>
            <p className="text-muted-foreground">
              각 곡에 필요한 멤버들이 모두 가능한 시간을 추천합니다
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">사용 방법</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">방 만들기</h4>
                <p className="text-muted-foreground">
                  연습 기간, 멤버, 곡 정보를 입력하여 방을 만듭니다
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">링크 공유</h4>
                <p className="text-muted-foreground">
                  생성된 링크를 밴드 멤버들에게 공유합니다
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">가능 시간 입력</h4>
                <p className="text-muted-foreground">
                  각 멤버가 자신의 가능한 시간대를 입력합니다
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold flex-shrink-0">
                4
              </div>
              <div>
                <h4 className="font-semibold mb-1">최적 시간 확인</h4>
                <p className="text-muted-foreground">
                  자동으로 계산된 최적의 연습 시간을 확인합니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

