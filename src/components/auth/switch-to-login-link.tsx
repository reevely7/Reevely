"use client";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export function SwitchToLoginLink({ className }: { className?: string }) {
  const router = useRouter();

  async function handleClick() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      로그인하기
    </button>
  );
}
