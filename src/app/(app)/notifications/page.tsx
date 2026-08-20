import { redirect } from "next/navigation";

import { BellIcon } from "@/components/icons/bell-icon";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { NotificationRow } from "@/components/notifications/notification-row";
import { getNotifications } from "@/lib/db/queries/notifications";
import { createClient } from "@/lib/supabase/server";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const notifications = await getNotifications(user.id);
  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            알림
          </p>
          <p className="text-xs text-muted-foreground">
            알림 받기로 설정한 작성자가 새로 남긴 악성 댓글입니다.
          </p>
        </div>
        {hasUnread && <MarkAllReadButton />}
      </header>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
          <BellIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            아직 알림이 없습니다. 작성자 상세 페이지에서 &quot;새 댓글 알림
            받기&quot;를 눌러보세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
            />
          ))}
        </div>
      )}
    </main>
  );
}
