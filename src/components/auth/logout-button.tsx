"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  className,
  variant = "outline",
  icon,
}: {
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link";
  icon?: ReactNode;
}) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  }

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      onClick={handleSignOut}
    >
      {icon}
      로그아웃
    </Button>
  );
}
