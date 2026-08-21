import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export function ReviewCallout({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Link
      href="/review"
      className="flex items-center justify-between gap-3 rounded-2xl bg-status-needs-review-bg px-5 py-4 transition-colors hover:brightness-95"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle
          className="size-4 shrink-0 text-status-needs-review"
          aria-hidden
        />
        <p className="text-sm text-status-needs-review">
          검토 필요 댓글이 {count}건 있습니다
        </p>
      </div>
      <span className="shrink-0 text-xs font-medium text-status-needs-review underline underline-offset-2">
        검토하러 가기 →
      </span>
    </Link>
  );
}
