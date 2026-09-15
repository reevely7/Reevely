import { CheckCircle2 } from "lucide-react";

import { ReviewQueueList } from "@/components/comments/review-queue-list";
import { requireChannelOwnership } from "@/lib/auth/require-channel-ownership";
import { getReviewQueue } from "@/lib/db/queries/comments";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  await requireChannelOwnership(channelId);
  const queue = await getReviewQueue(channelId);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          검토 필요
        </p>
        <p className="text-xs text-muted-foreground">
          AI 확신도가 낮은 댓글만 모아 직접 판단할 수 있습니다.
        </p>
      </header>

      {queue.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <CheckCircle2 className="size-8 text-risk-low" aria-hidden />
          <p className="text-sm text-muted-foreground">
            검토할 댓글이 없습니다.
          </p>
        </div>
      ) : (
        <ReviewQueueList queue={queue} channelId={channelId} />
      )}
    </main>
  );
}
