import { Link2, ShieldCheck, TriangleAlert } from "lucide-react";

import { KakaoIcon } from "@/components/icons/kakao-icon";
import { YoutubeIcon } from "@/components/icons/youtube-icon";

// "이렇게 동작해요" 4단계 카드 가운데 들어가는 미니 일러스트.
// 실제 이미지 없이 CSS만으로 각 단계를 요약해 보여준다. 높이 h-28로 통일.

export function ConnectChannelVisual() {
  return (
    <div className="relative flex h-28 w-full items-center justify-center">
      <div
        aria-hidden
        className="absolute h-20 w-44 rotate-[-5deg] rounded-[3rem] bg-[#dfeade]"
      />
      <div className="relative flex items-center">
        <div className="flex size-12 -rotate-6 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
          <YoutubeIcon className="size-6 text-red-500" />
        </div>
        <div className="z-10 -mx-1 flex size-12 -translate-y-3 items-center justify-center rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
          <Link2 className="size-6 text-primary" />
        </div>
        <div className="flex size-12 rotate-6 items-center justify-center rounded-2xl bg-[#FEE500] shadow-lg ring-1 ring-black/5">
          <KakaoIcon className="size-6 text-[#3C1E1E]" />
        </div>
      </div>
    </div>
  );
}

export function WatchCommentsVisual() {
  return (
    <div className="relative flex h-28 w-full items-center justify-center">
      <div
        aria-hidden
        className="absolute h-20 w-40 rotate-3 rounded-[2rem] bg-[#dfeade]"
      />
      <div className="relative w-36 space-y-2.5 rounded-xl bg-white p-3.5 shadow-lg ring-1 ring-black/5">
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-2">
            <span
              className="size-4 shrink-0 rounded-full bg-[#cfe0d4]"
              aria-hidden
            />
            <span
              className="h-1.5 rounded-full bg-[#e5eae5]"
              style={{ width: ["100%", "72%", "86%"][row] }}
              aria-hidden
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AiJudgeVisual() {
  return (
    <div className="relative flex h-28 w-full items-center justify-center">
      <div className="relative">
        {/* 안테나 */}
        <div
          aria-hidden
          className="absolute -top-4 left-1/2 h-4 w-0.5 -translate-x-1/2 bg-primary"
        />
        <div
          aria-hidden
          className="absolute -top-6 left-1/2 size-2 -translate-x-1/2 rounded-full bg-primary"
        />
        {/* 얼굴 */}
        <div className="flex h-14 w-20 items-center justify-center rounded-[1.4rem] bg-primary shadow-lg shadow-primary/25">
          <div className="flex gap-3">
            <span className="size-2.5 rounded-full bg-white" aria-hidden />
            <span className="size-2.5 rounded-full bg-white" aria-hidden />
          </div>
        </div>
        {/* 경고 말풍선 */}
        <div className="absolute -top-6 -right-10 flex size-12 items-center justify-center rounded-2xl rounded-bl-sm bg-white shadow-lg ring-1 ring-black/5">
          <span className="flex size-7 items-center justify-center rounded-lg bg-[#e05252]">
            <TriangleAlert className="size-4 text-white" />
          </span>
        </div>
      </div>
    </div>
  );
}

export function DashboardVisual() {
  return (
    <div className="relative flex h-28 w-full items-center justify-center">
      <div className="w-44 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-black/5">
        <div className="flex gap-1" aria-hidden>
          <span className="size-1.5 rounded-full bg-[#d9ded9]" />
          <span className="size-1.5 rounded-full bg-[#d9ded9]" />
          <span className="size-1.5 rounded-full bg-[#d9ded9]" />
        </div>
        <div className="mt-2 flex gap-2">
          <div className="flex h-[68px] w-12 flex-col items-center gap-1.5 rounded-lg bg-primary pt-2">
            <ShieldCheck className="size-4 text-white" />
            <span className="h-1 w-6 rounded-full bg-white/30" aria-hidden />
            <span className="h-1 w-6 rounded-full bg-white/30" aria-hidden />
          </div>
          <div className="flex flex-1 flex-col items-start gap-1.5">
            <span className="rounded-full bg-[#e05252] px-2 py-0.5 text-[9px] leading-none font-bold text-white">
              High
            </span>
            <span className="rounded-full bg-[#f6d878] px-2 py-0.5 text-[9px] leading-none font-bold text-[#7a5d12]">
              Medium
            </span>
            <span className="rounded-full bg-[#4f9c6b] px-2 py-0.5 text-[9px] leading-none font-bold text-white">
              Low
            </span>
            <span
              className="mt-0.5 h-1 w-12 rounded-full bg-[#e5eae5]"
              aria-hidden
            />
          </div>
        </div>
      </div>
    </div>
  );
}
