import { NextResponse } from "next/server";

import { getChannelById } from "@/lib/db/queries/channels";
import {
  getFlaggedCommentIds,
  type CommentFilters,
} from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

// 댓글 목록 "필터에 맞는 전체 선택"용 — 현재 페이지에 로드된 행뿐 아니라
// 필터에 일치하는 모든 댓글의 id를 가져와 벌크 처리(상태 변경·증거 보관)에 쓴다
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const channelId = searchParams.get("channelId");
  if (!channelId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const channel = await getChannelById(channelId);
  if (!channel || channel.userId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const filters: CommentFilters = {
    riskLevel: (searchParams.get("risk") as CommentFilters["riskLevel"]) ?? undefined,
    category: searchParams.get("category") ?? undefined,
    status: (searchParams.get("status") as CommentFilters["status"]) ?? undefined,
    platform:
      (searchParams.get("platform") as CommentFilters["platform"]) ?? undefined,
    videoId: searchParams.get("video") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
  };

  const { ids, truncated } = await getFlaggedCommentIds(channelId, filters);
  return NextResponse.json({ ids, truncated });
}
