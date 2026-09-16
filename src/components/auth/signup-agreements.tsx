"use client";

import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

const checkboxClassName = "mt-0.5 size-4 shrink-0 accent-primary";

export function SignupAgreements({ children }: { children?: ReactNode }) {
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  const allAgreed = agreeTerms && agreeAge && agreeMarketing;

  function toggleAll(checked: boolean) {
    setAgreeTerms(checked);
    setAgreeAge(checked);
    setAgreeMarketing(checked);
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-lg border border-border px-3.5 py-3 text-sm font-medium text-card-foreground">
        <input
          type="checkbox"
          checked={allAgreed}
          onChange={(e) => toggleAll(e.target.checked)}
          className="size-4 shrink-0 accent-primary"
        />
        전체 동의
      </label>

      {children}

      <div className="space-y-2.5 px-1">
        <label className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-start gap-2">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              className={checkboxClassName}
            />
            <span>
              (필수){" "}
              <a href="/terms" target="_blank" className="underline">
                이용약관
              </a>{" "}
              및{" "}
              <a href="/privacy" target="_blank" className="underline">
                개인정보처리방침
              </a>
              에 동의합니다.
            </span>
          </span>
          <ChevronRight
            className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
            aria-hidden
          />
        </label>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="agreeAge"
            checked={agreeAge}
            onChange={(e) => setAgreeAge(e.target.checked)}
            className={checkboxClassName}
          />
          <span>(필수) 만 14세 이상입니다.</span>
        </label>

        <label className="flex items-start gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            name="agreeMarketing"
            checked={agreeMarketing}
            onChange={(e) => setAgreeMarketing(e.target.checked)}
            className={checkboxClassName}
          />
          <span>(선택) 마케팅 정보 수신에 동의합니다.</span>
        </label>
      </div>
    </div>
  );
}
