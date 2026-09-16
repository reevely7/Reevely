import { Sparkles } from "lucide-react";

import { YoutubeIcon } from "@/components/icons/youtube-icon";

// About 히어로 우측 상단에 겹쳐 놓는 미니 프리뷰 — "AI가 댓글을 먼저
// 읽는다"는 컨셉을 요약해서 보여주는 카드. 실제 데이터는 아니다.

const TAG_STYLES = {
  긍정: "bg-[#e4efe6] text-[#2f6b4d]",
  주의: "bg-[#fbf0d2] text-[#8a6d1f]",
  일반: "bg-[#eef0ee] text-[#6b7871]",
  위험: "bg-[#fce8e8] text-[#c04545]",
} as const;

const ROWS: Array<{ text: string; tag: keyof typeof TAG_STYLES }> = [
  { text: "항상 좋은 영상이에요! 항상 응원합니다", tag: "긍정" },
  { text: "이런 흠 아닌 것 같은데...", tag: "주의" },
  { text: "ㅋㅋㅋㅋㅋㅋㅋㅋ", tag: "일반" },
  { text: "이 사람은 왜 이런 걸 물을까?", tag: "위험" },
];

export function AboutHeroPreview() {
  return (
    <div className="relative w-[300px] sm:w-[340px]">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[3rem] bg-[var(--landing-lime)]/15 blur-2xl"
      />
      <div className="rounded-[1.5rem] bg-white/95 p-4 shadow-[0_40px_90px_-30px_rgba(8,20,14,0.55)] ring-1 ring-black/[0.05] backdrop-blur-sm">
        <div className="flex items-center justify-between px-1 pb-2.5">
          <div className="flex items-center gap-1.5">
            <YoutubeIcon className="size-4 text-red-500" />
            <span className="text-[13px] font-bold text-[#16241d]">
              Youtube 댓글
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--landing-ink)] px-2 py-1 text-[10px] font-bold text-[var(--landing-lime)]">
            <Sparkles className="size-3" />
            AI 분석 중...
          </span>
        </div>
        <div className="space-y-1.5">
          {ROWS.map((row) => (
            <div
              key={row.text}
              className="flex items-center gap-2 rounded-xl bg-[#f7f9f7] px-2.5 py-2"
            >
              <span
                className="size-5 shrink-0 rounded-full bg-[#d7e2d9]"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate text-[11px] text-[#4b5a51]">
                {row.text}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${TAG_STYLES[row.tag]}`}
              >
                {row.tag}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
