import Link from "next/link";
import { Archive } from "lucide-react";

import { EvidenceArchiveList } from "@/components/comments/evidence-archive-list";
import { buttonVariants } from "@/components/ui/button";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import { getArchivedComments } from "@/lib/db/queries/comments";

export default async function EvidenceArchivePage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);
  const archived = await getArchivedComments(channelId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          증거 보관함 · PDF 저장 가능
        </p>
        <p className="text-xs text-muted-foreground">
          악성댓글 원문, 영상 링크, 수집일, AI 판정 기록을 안전하게 보관합니다.
        </p>
      </header>

      {archived.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-16 text-center">
          <Archive className="size-8 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">
            아직 보관된 증거가 없어요.
          </p>
          <Link
            href={`/c/${channelId}/comments`}
            className={buttonVariants({ size: "sm" })}
          >
            첫 증거 보관하기
          </Link>
        </div>
      ) : (
        <EvidenceArchiveList archived={archived} channelId={channelId} />
      )}
    </main>
  );
}
