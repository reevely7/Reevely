import Link from "next/link";

import { CONTACT_EMAILS } from "@/lib/contact";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background px-8 py-12 sm:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <p className="text-base font-semibold tracking-tight text-foreground">
            Reevely
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            소속사도 법무팀도 없는 크리에이터를 위한 AI 기반 악성 댓글
            탐지·증거관리 서비스
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3">
          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              회사
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/about"
                  className="text-muted-foreground hover:text-foreground"
                >
                  회사 소개
                </Link>
              </li>
              <li>
                <Link
                  href="/partnership"
                  className="text-muted-foreground hover:text-foreground"
                >
                  제휴 제안
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              법적 고지
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/terms"
                  className="text-muted-foreground hover:text-foreground"
                >
                  이용약관
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-muted-foreground hover:text-foreground"
                >
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              지원
            </p>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/support"
                  className="text-muted-foreground hover:text-foreground"
                >
                  고객센터
                </Link>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAILS.support}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {CONTACT_EMAILS.support}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl border-t border-border pt-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Reevely. All rights reserved.
      </div>
    </footer>
  );
}
