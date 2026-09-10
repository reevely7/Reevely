import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function BillingFailPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <p className="text-lg font-semibold text-foreground">결제에 실패했어요</p>
      <p className="text-sm text-muted-foreground">
        카드 인증이나 결제 승인이 완료되지 않았습니다. 다시 시도해 주세요.
      </p>
      <Button
        nativeButton={false}
        render={<Link href="/mypage/subscription">구독 관리로 돌아가기</Link>}
      />
    </main>
  );
}
