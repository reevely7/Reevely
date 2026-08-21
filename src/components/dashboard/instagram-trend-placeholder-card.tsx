import { Clock } from "lucide-react";

export function InstagramTrendPlaceholderCard() {
  return (
    <div className="flex h-full min-h-72 flex-col gap-4 rounded-2xl bg-card px-5 py-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-card-foreground">
          인스타그램 위험 댓글 추이
        </p>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          예정
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-center">
        <Clock className="size-6 text-muted-foreground" aria-hidden />
        <p className="text-xs text-muted-foreground">
          인스타그램 연동은 다음 단계에서 지원될 예정입니다.
        </p>
      </div>
    </div>
  );
}
