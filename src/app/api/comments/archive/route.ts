import { NextResponse } from "next/server";

import { getChannelById } from "@/lib/db/queries/channels";
import {
  ARCHIVE_PAGE_SIZE,
  countArchivedCommentsByChannelId,
  getArchivedComments,
  getCommentsByAuthor,
} from "@/lib/db/queries/comments";
import { createClient } from "@/lib/supabase/server";

// 증거 보관함 좌측 목록 무한스크롤용 — offset 다음 페이지를 가져오면서, 그
// 배치에 등장하는 작성자들의 "다른 댓글" 이력도 함께 묶어서 내려준다
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
  const offset = Number(searchParams.get("offset") ?? "0");
  if (!channelId || !Number.isFinite(offset) || offset < 0) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const channel = await getChannelById(channelId);
  if (!channel || channel.userId !== user.id) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const [items, total] = await Promise.all([
    getArchivedComments(channelId, ARCHIVE_PAGE_SIZE, offset),
    countArchivedCommentsByChannelId(channelId),
  ]);

  const uniqueAuthorChannelIds = Array.from(
    new Set(items.map((comment) => comment.authorChannelId)),
  );
  const authorHistoryEntries = await Promise.all(
    uniqueAuthorChannelIds.map(async (authorChannelId) => {
      const comments = await getCommentsByAuthor(channelId, authorChannelId);
      return [authorChannelId, comments] as const;
    }),
  );

  return NextResponse.json({
    items,
    authorHistory: Object.fromEntries(authorHistoryEntries),
    hasMore: offset + items.length < total,
  });
}
