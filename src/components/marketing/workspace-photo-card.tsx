import { Leaf } from "lucide-react";

import { handwritingFont } from "@/lib/fonts";

// 실제 사진 대신 CSS로 만든 "책상 위 노트북" 무드 카드.
// About/Partnership 히어로 옆에 놓여 손글씨 문구와 함께 브랜드 톤을 보여준다.
export function WorkspacePhotoCard({
  note,
}: {
  note: string[];
}) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-[#eef5ef] via-[#e3eee5] to-[#cfe0d3] shadow-lg">
      <div
        aria-hidden
        className={`${handwritingFont.className} absolute top-6 right-7 max-w-[46%] rotate-[-4deg] text-lg leading-[1.15] font-semibold text-[#3d4a43]`}
      >
        {note.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      {/* 화분 */}
      <div className="absolute top-8 left-8 flex flex-col items-center">
        <Leaf className="size-8 -rotate-12 text-[#4a7c5a]" strokeWidth={1.5} />
        <div className="mt-0.5 h-6 w-8 rounded-b-lg bg-[#b7c9ba]" />
      </div>

      {/* 노트북 */}
      <div className="absolute bottom-10 left-1/2 w-[62%] -translate-x-1/2">
        <div className="rounded-t-lg border-2 border-b-0 border-[#2c3b32] bg-[#16241d] p-2.5 shadow-md">
          <div className="space-y-1.5 rounded bg-white/90 p-2.5">
            <div className="h-1.5 w-2/3 rounded-full bg-[#cfe0d3]" />
            <div className="h-1.5 w-full rounded-full bg-[#e4efe6]" />
            <div className="h-1.5 w-4/5 rounded-full bg-[#e4efe6]" />
          </div>
        </div>
        <div className="h-2 rounded-b-md bg-[#2c3b32]" />
        <div className="mx-auto h-1 w-1/3 rounded-b-lg bg-[#1b2a21]" />
      </div>

      {/* 머그컵 */}
      <div className="absolute right-10 bottom-12 flex h-7 w-6 items-center">
        <div className="h-full w-full rounded-sm bg-[#3e6856]" />
        <div className="h-3 w-2 rounded-r-full border-2 border-l-0 border-[#3e6856]" />
      </div>
    </div>
  );
}
