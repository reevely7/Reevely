import Image from "next/image";

import { handwritingFont } from "@/lib/fonts";

// About/Partnership/Support 히어로 옆, 그리고 About "Our Why" 섹션에
// 놓이는 사진 카드. note를 넘기면 우측 상단에 손글씨 문구가 겹친다
// (포레스트 그린, 화이트 배경 위에서 쓰는 용도).
export function WorkspacePhotoCard({
  imageSrc,
  note,
}: {
  imageSrc: string;
  note?: string[];
}) {
  return (
    <div className="relative aspect-[4/3] w-full">
      {note && note.length > 0 && (
        <div
          aria-hidden
          className={`${handwritingFont.className} absolute -top-9 right-2 z-10 rotate-[-4deg] text-lg leading-[1.15] font-semibold text-[#3e6856] sm:-top-10`}
        >
          {note.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      )}
      <div className="relative h-full w-full overflow-hidden rounded-[2rem]">
        <Image
          src={imageSrc}
          alt=""
          fill
          sizes="(min-width: 1024px) 40vw, 90vw"
          className="object-contain"
        />
      </div>
    </div>
  );
}
