"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronDown, CreditCard, LogOut, User } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function TopBarAccountMenu({
  nickname,
  email,
}: {
  nickname: string | null;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
  const displayName = nickname || "마이페이지";
  const initial = (nickname || "R").charAt(0).toUpperCase();

  const menuItemClassName =
    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground hover:bg-accent";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label="마이페이지 메뉴"
        className="flex items-center gap-1.5 rounded-md py-1 pr-1 pl-1.5 text-sm text-foreground hover:bg-accent"
      >
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initial}
        </span>
        <span className="max-w-32 truncate">{displayName}</span>
        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </PopoverTrigger>

      <PopoverContent align="end" className="w-60 gap-1 p-1.5">
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-foreground">
              {displayName}
            </span>
            {email && (
              <span className="block truncate text-xs text-muted-foreground">
                {email}
              </span>
            )}
          </span>
        </div>

        <div className="border-t border-border" />

        <Link
          href="/mypage/profile"
          onClick={() => setOpen(false)}
          className={menuItemClassName}
        >
          <User className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          마이페이지
        </Link>
        <Link
          href="/mypage/subscription/plans"
          onClick={() => setOpen(false)}
          className={menuItemClassName}
        >
          <CreditCard className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          요금제 관리
        </Link>

        <div className="border-t border-border pt-1">
          <LogoutButton
            variant="ghost"
            className={`w-full justify-start ${menuItemClassName}`}
            icon={
              <LogOut
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            }
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
