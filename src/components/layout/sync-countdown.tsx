"use client";

import { useEffect, useState } from "react";

function formatCountdown(ms: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad(hours)}시간 ${pad(minutes)}분 ${pad(seconds)}초`;
}

// 서버·클라이언트 렌더 시점의 Date.now() 차이로 하이드레이션 경고가 나지
// 않도록, 마운트 전에는 아무 것도 렌더링하지 않고 useEffect에서만 초 단위로
// 갱신한다.
export function SyncCountdown({ target }: { target: Date }) {
  const [msLeft, setMsLeft] = useState<number | null>(null);

  useEffect(() => {
    function tick() {
      setMsLeft(target.getTime() - Date.now());
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  if (msLeft === null) return null;

  return <>{msLeft <= 0 ? "곧" : formatCountdown(msLeft)}</>;
}
