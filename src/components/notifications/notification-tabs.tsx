"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { NOTIFICATION_TABS } from "@/lib/notifications/tabs";

export function NotificationTabs({
  counts,
}: {
  counts: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "all";

  function handleClick(tabKey: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (tabKey === "all") {
      params.delete("tab");
    } else {
      params.set("tab", tabKey);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="flex flex-wrap gap-2" role="tablist">
      {NOTIFICATION_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(tab.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label} {counts[tab.key] ?? 0}
          </button>
        );
      })}
    </div>
  );
}
