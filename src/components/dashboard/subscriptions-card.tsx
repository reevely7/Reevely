import Link from "next/link";

export function SubscriptionsCard({ count }: { count: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4">
      <div>
        <p className="text-xs text-muted-foreground">구독 중인 작성자</p>
        <p className="mt-1 text-3xl font-semibold text-card-foreground">
          {count.toLocaleString("ko-KR")}
        </p>
      </div>
      <Link
        href="/mypage"
        className="shrink-0 text-xs text-primary underline underline-offset-2"
      >
        마이페이지에서 관리 →
      </Link>
    </div>
  );
}
