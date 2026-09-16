import type { ComponentType, ReactNode } from "react";

// 랜딩페이지 섹션 상단에 반복적으로 쓰는 아이콘+텍스트 알약 배지.
// tone="white"는 연녹색 패널 위에 올릴 때 사용한다.
export function EyebrowBadge({
  icon: Icon,
  tone = "green",
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  tone?: "green" | "white";
  children: ReactNode;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-primary ${
        tone === "white" ? "bg-white shadow-sm" : "bg-[#e4efe6]"
      }`}
    >
      {Icon && <Icon className="size-4" />}
      {children}
    </div>
  );
}
