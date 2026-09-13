import { NextResponse } from "next/server";

import { analyzePendingComments } from "@/lib/ai/analyze-pending-comments";
import { getAllChannels, isSyncDue, markReauthRequired } from "@/lib/db/queries/channels";
import { maybeCreateWeeklyDigest, notifyReauthRequired } from "@/lib/db/queries/notifications";
import { getSyncIntervalForUser } from "@/lib/db/queries/subscriptions";
import { mapWithConcurrency } from "@/lib/utils/concurrency";
import { ReauthRequiredError } from "@/lib/youtube/refresh-access-token";
import { syncComments } from "@/lib/youtube/sync-comments";

// Vercel Fluid Compute 기본 300초 한도까지 명시적으로 확보 — 채널이 늘어날수록
// 처리 시간도 늘어나므로 타임아웃 여유를 최대한 준다.
export const maxDuration = 300;

// 월 분석량 한도(getMonthlyAnalysisLimitForUser)는 유저 계정 전체 채널을
// 합산한 값이라, 같은 유저의 채널끼리 동시에 처리하면 "이번 달 남은 한도"를
// 동시에 읽어 한도를 살짝 넘길 수 있다(레이스). 그래서 userId로 묶어 같은
// 유저의 채널은 그룹 안에서 순차로, 서로 다른 유저 그룹끼리만 동시에 처리한다.
const USER_GROUP_CONCURRENCY = 5;

// 수동 트리거 버튼은 없앴고, 이 cron이 전체 파이프라인의 유일한 진입점이다.
// vercel.json에서 30분마다 호출하고, 채널별로 isSyncDue()가 그 채널 소유자의
// 플랜별 고정 주기(getSyncIntervalForUser — 무료 24시간, 베이직 6시간, 플러스
// 1시간, 프로 30분)가 지났는지 판단해 실제로 sync를 돌릴지 건너뛸지 정한다.
// 프로의 "30분마다"는 이 cron 자체의 주기가 상한이라, cron이 30분보다 느리게
// 돌면 그만큼 늦어진다. 실제 배포 시 반드시 확인할 것:
// 1. Vercel 프로젝트 환경변수에 CRON_SECRET을 .env.local과 동일한 값으로 등록
// 2. Hobby 플랜은 cron 주기 제한이 있을 수 있음 — 30분(*/30 * * * *)이
//    실제로 지원되는지 확인, 안 되면 Pro로 업그레이드하거나 주기를 늘릴 것
// 3. YouTube API 쿼터는 프로젝트 전체 공유(기본 하루 10,000유닛) — cron 주기가
//    짧아진 만큼, 특히 프로 플랜 채널이 많아지면 이 주기로 감당 가능한지
//    재계산 필요

type ChannelResultEntry = {
  userId: string;
  channelTitle: string;
  sync?: unknown;
  analyze?: unknown;
};

async function processChannel(
  channel: Awaited<ReturnType<typeof getAllChannels>>[number],
): Promise<ChannelResultEntry> {
  const entry: ChannelResultEntry = {
    userId: channel.userId,
    channelTitle: channel.channelTitle,
  };

  // 플랜 한도 초과로 잠긴 채널은 sync·분석·다이제스트 전부 건너뛴다
  if (channel.status === "locked") {
    entry.sync = "locked";
    return entry;
  }

  const syncIntervalMs = await getSyncIntervalForUser(channel.userId);

  // 이미 재연동이 필요하다고 확인된 채널은 재연동 전까지 sync 시도 자체를
  // 건너뛴다 — 안 그러면 30분마다 똑같이 실패만 반복하게 된다.
  if (channel.reauthRequiredAt) {
    entry.sync = "reauth_required";
  } else if (isSyncDue(channel, syncIntervalMs)) {
    try {
      entry.sync = await syncComments(channel);
    } catch (e) {
      if (e instanceof ReauthRequiredError) {
        entry.sync = "reauth_required";
        const reauthRequiredAt = await markReauthRequired(channel.id);
        await notifyReauthRequired(
          channel.userId,
          channel.id,
          channel.channelTitle,
          reauthRequiredAt,
        );
      } else {
        entry.sync = "failed";
        console.error(`[cron] sync 실패 (${channel.channelTitle}):`, e);
      }
    }
  } else {
    entry.sync = "not_due";
  }

  try {
    entry.analyze = await analyzePendingComments(channel.userId, channel.id);
  } catch (e) {
    entry.analyze = "failed";
    console.error(`[cron] 분석 실패 (${channel.channelTitle}):`, e);
  }

  // 별도 주간 cron 없이, 매시간 도는 이 cron 안에서 "때가 됐을 때만"
  // 생성된다 (maybeCreateWeeklyDigest 내부에서 최근 7일 이내 생성 여부 확인)
  try {
    await maybeCreateWeeklyDigest(channel.userId, channel.id);
  } catch (e) {
    console.error(`[cron] 주간 다이제스트 실패 (${channel.channelTitle}):`, e);
  }

  return entry;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const channels = await getAllChannels();

  const channelsByUser = new Map<string, typeof channels>();
  for (const channel of channels) {
    const group = channelsByUser.get(channel.userId);
    if (group) {
      group.push(channel);
    } else {
      channelsByUser.set(channel.userId, [channel]);
    }
  }

  const grouped = await mapWithConcurrency(
    [...channelsByUser.values()],
    USER_GROUP_CONCURRENCY,
    async (userChannels) => {
      const entries: ChannelResultEntry[] = [];
      for (const channel of userChannels) {
        entries.push(await processChannel(channel));
      }
      return entries;
    },
  );

  const results = grouped.flat();

  return NextResponse.json({ processedChannels: results.length, results });
}
