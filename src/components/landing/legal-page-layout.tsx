import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function LegalPageLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col bg-background px-8 py-16 text-foreground sm:px-12">
      <div className="mx-auto w-full max-w-2xl">
        <Link
          href="/"
          className="mb-8 flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          홈으로 돌아가기
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {updatedAt && (
          <p className="mt-1 text-xs text-muted-foreground">
            최종 수정일 {updatedAt}
          </p>
        )}

        <div
          className="mt-8 flex flex-col gap-8 text-sm leading-relaxed text-muted-foreground
          [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground
          [&_p]:mt-2 [&_p]:leading-relaxed
          [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
        >
          {children}
        </div>
      </div>
    </main>
  );
}
