import { Archive } from "lucide-react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export default async function EvidenceArchivePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col gap-6 px-6 py-8 sm:px-10">
      <header>
        <p className="text-xl font-semibold tracking-tight text-foreground">
          증거 보관함
        </p>
        <p className="text-xs text-muted-foreground">
          확정된 악성 댓글의 증거를 모아두는 공간입니다.
        </p>
      </header>

      <div className="flex flex-col items-center gap-2 rounded-2xl bg-card px-6 py-16 text-center">
        <Archive className="size-8 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">추가 예정입니다.</p>
      </div>
    </main>
  );
}
