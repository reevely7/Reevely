"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function formatCountdown(ms: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}시간 ${pad(minutes)}분 ${pad(seconds)}초`;
}

const POLL_INTERVAL_MS = 5000;

// 서버·클라이언트 렌더 시점의 Date.now() 차이로 하이드레이션 경고가 나지
// 않도록, 마운트 전에는 아무 것도 렌더링하지 않고 useEffect에서만 초 단위로
// 갱신한다.
export function SyncCountdown({ target }: { target: Date }) {
  const router = useRouter();
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setMsLeft(target.getTime() - Date.now());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  // 목표 시각이 지났는데 실제 cron이 아직 안 돌아 target(서버의
  // lastSyncedAt 기반 다음 sync 시각)이 그대로인 경우 — cron이 실제로
  // 끝나 target이 갱신될 때까지 주기적으로 서버 데이터를 다시 가져온다.
  // 이 컴포넌트가 (app) 레이아웃 안에 있어서, 갱신되면 현재 페이지의
  // 댓글 목록도 새로고침 없이 함께 반영된다.
  useEffect(() => {
    if (msLeft === null || msLeft > 0) return;
    const id = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [msLeft, router]);

  if (msLeft === null) return null;

  return <>{msLeft <= 0 ? "업데이트중…" : formatCountdown(msLeft)}</>;
}
