import Link from "next/link";

type NotificationRow = {
  id: string;
  message: string | null;
  href: string | null;
  createdAt: Date;
};

function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())}`;
}

export function RepeatAuthorNotificationsCard({
  rows,
}: {
  rows: NotificationRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-card px-5 py-4">
      <p className="text-sm font-medium text-card-foreground">
        구독 제안
      </p>
      <div className="flex flex-col divide-y divide-border">
        {rows.map((row) => {
          const content = (
            <div className="flex items-center justify-between gap-3 py-2.5">
              <p className="min-w-0 flex-1 truncate text-[13px] text-card-foreground">
                {row.message}
              </p>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatDate(row.createdAt)}
              </span>
            </div>
          );

          return row.href ? (
            <Link key={row.id} href={row.href} className="hover:text-primary">
              {content}
            </Link>
          ) : (
            <div key={row.id}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
