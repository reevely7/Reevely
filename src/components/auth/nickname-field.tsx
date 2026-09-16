"use client";

import { useState } from "react";

import {
  containsHangul,
  MAX_HANGUL_CHARS,
  MAX_OTHER_CHARS,
  NICKNAME_SPEC_GUIDE,
} from "@/lib/validation/nickname";

export function NicknameField({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const displayMax = containsHangul(value) ? MAX_HANGUL_CHARS : MAX_OTHER_CHARS;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="nickname" className="text-sm font-medium text-card-foreground">
          닉네임
        </label>
        {value.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {value.length}/{displayMax}
          </span>
        )}
      </div>
      <input
        id="nickname"
        type="text"
        name="nickname"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="닉네임을 입력해주세요"
        className="h-11 w-full rounded-lg border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground"
      />
      <p className="text-[11px] leading-relaxed text-destructive">
        {NICKNAME_SPEC_GUIDE}
      </p>
    </div>
  );
}
