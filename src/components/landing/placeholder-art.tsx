import { ImageIcon } from "lucide-react";

// 3D 일러스트·캐릭터가 들어갈 자리 표시용 플레이스홀더.
// 실제 이미지가 준비되면 이 컴포넌트를 <Image>로 교체한다.
export function PlaceholderArt({
  label,
  className = "",
}: {
  /** 이 자리에 필요한 이미지 설명 (예: "방패 든 3D 캐릭터") */
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-black/15 bg-black/[0.03] text-center ${className}`}
    >
      <ImageIcon className="size-6 text-black/25" aria-hidden />
      <p className="px-3 text-[11px] leading-snug font-semibold text-black/35">
        {label}
      </p>
    </div>
  );
}
