import "server-only";

import { notFound, redirect } from "next/navigation";

import { getChannelById } from "@/lib/db/queries/channels";
import { createClient } from "@/lib/supabase/server";

// /c/[channelId] 하위 페이지 전용 이중 방어. layout.tsx가 이미 소유권을
// 확인하지만, 라우팅 구조나 캐싱 정책이 바뀌어도 페이지 단독으로 크로스유저
// 데이터 노출을 막을 수 있게 각 페이지에서도 다시 확인한다.
export async function requireChannelOwnership(channelId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const channel = await getChannelById(channelId);
  if (!channel || channel.userId !== user.id) {
    notFound();
  }

  return channel;
}
