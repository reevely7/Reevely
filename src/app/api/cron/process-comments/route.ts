import { NextResponse } from "next/server";

import { analyzePendingComments } from "@/lib/ai/analyze-pending-comments";
import { getAllChannels, isSyncDue } from "@/lib/db/queries/channels";
import { maybeCreateWeeklyDigest } from "@/lib/db/queries/notifications";
import { syncComments } from "@/lib/youtube/sync-comments";

// 수동 트리거 버튼은 없앴고, 이 cron이 전체 파이프라인의 유일한 진입점이다.
// vercel.json에서 1시간마다 호출하고, 채널별로 isSyncDue()가 신선도 기반
// 폴링 주기(최근 48시간 내 새 영상 있으면 1시간, 없으면 6시간)를 판단해
// 실제로 sync를 돌릴지 건너뛸지 정한다. 실제 배포 시 반드시 확인할 것:
// 1. Vercel 프로젝트 환경변수에 CRON_SECRET을 .env.local과 동일한 값으로 등록
// 2. Hobby 플랜은 cron 주기 제한이 있을 수 있음 — 1시간(0 * * * *)이
//    실제로 지원되는지 확인, 안 되면 Pro로 업그레이드하거나 주기를 늘릴 것
// 3. YouTube API 쿼터는 프로젝트 전체 공유(기본 하루 10,000유닛) — 신선한
//    채널이 많아지면 이 주기로 감당 가능한지 재계산 필요

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const channels = await getAllChannels();
  const results = [];

  for (const channel of channels) {
    const entry: {
      userId: string;
      channelTitle: string;
      sync?: unknown;
      analyze?: unknown;
    } = { userId: channel.userId, channelTitle: channel.channelTitle };

    if (isSyncDue(channel)) {
      try {
        entry.sync = await syncComments(channel);
      } catch (e) {
        entry.sync = "failed";
        console.error(`[cron] sync 실패 (${channel.channelTitle}):`, e);
      }
    } else {
      entry.sync = "not_due";
    }

    try {
      entry.analyze = await analyzePendingComments(channel.userId);
    } catch (e) {
      entry.analyze = "failed";
      console.error(`[cron] 분석 실패 (${channel.channelTitle}):`, e);
    }

    // 별도 주간 cron 없이, 매시간 도는 이 cron 안에서 "때가 됐을 때만"
    // 생성된다 (maybeCreateWeeklyDigest 내부에서 최근 7일 이내 생성 여부 확인)
    try {
      await maybeCreateWeeklyDigest(channel.userId);
    } catch (e) {
      console.error(`[cron] 주간 다이제스트 실패 (${channel.channelTitle}):`, e);
    }

    results.push(entry);
  }

  return NextResponse.json({ processedChannels: results.length, results });
}
