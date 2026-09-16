"use client";

import {
  Archive,
  ChevronDown,
  CreditCard,
  Link2,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  UserX,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { ComponentType } from "react";

import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { Reveal } from "@/components/landing/reveal";
import { CONTACT_EMAILS } from "@/lib/contact";

type CategoryKey =
  | "channel"
  | "analysis"
  | "ai"
  | "evidence"
  | "billing"
  | "account";

const CATEGORIES: Array<{
  key: CategoryKey;
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
}> = [
  {
    key: "channel",
    icon: Link2,
    title: "채널 연동",
    body: "유튜브 채널 연동 및 관리에 대한 도움말을 확인하세요.",
  },
  {
    key: "analysis",
    icon: MessageSquare,
    title: "댓글 분석",
    body: "댓글 수집, 분석 방식과 결과에 대해 안내합니다.",
  },
  {
    key: "ai",
    icon: Sparkles,
    title: "AI 분류·검토",
    body: "AI의 댓글 분류 기준과 검토 방법에 대해 설명합니다.",
  },
  {
    key: "evidence",
    icon: Archive,
    title: "증거 보관",
    body: "악성 댓글 증거 보관 기능과 데이터 관리에 대해 알려드립니다.",
  },
  {
    key: "billing",
    icon: CreditCard,
    title: "요금제·결제",
    body: "요금제 안내, 결제 방법 변경·취소에 대해 확인하세요.",
  },
  {
    key: "account",
    icon: UserX,
    title: "계정·탈퇴",
    body: "계정 관리, 채널 연동 해제, 탈퇴 절차에 대해 안내합니다.",
  },
];

const CATEGORY_LABEL: Record<CategoryKey, string> = Object.fromEntries(
  CATEGORIES.map((category) => [category.key, category.title]),
) as Record<CategoryKey, string>;

const FAQS: Array<{ q: string; a: string; category: CategoryKey }> = [
  {
    q: "댓글은 얼마나 자주 업데이트되나요?",
    a: "연동된 채널의 댓글은 플랜에 따라 30분~24시간 간격으로 자동 수집됩니다. 다만, 유튜브나 인스타그램 등 각 플랫폼의 API 정책에 따라 수집 주기가 달라질 수 있으며, 일시적인 지연이 발생할 수도 있습니다.",
    category: "analysis",
  },
  {
    q: "AI가 댓글을 잘못 분류하는 경우도 있나요?",
    a: "AI가 확신하지 못한 댓글(confidence 0.7 미만)은 자동으로 확정하지 않고 별도의 검토 큐로 분리합니다. 이미 확정된 판정이 잘못되었다면 대시보드의 '오탐 신고' 버튼으로 알려주세요.",
    category: "ai",
  },
  {
    q: "채널 연동을 해제하면 기존 데이터는 어떻게 되나요?",
    a: "설정 페이지에서 언제든지 채널 연동을 해제할 수 있습니다. 계정을 삭제하면 저장된 댓글·증거 데이터는 정책에 따라 영구적으로 파기됩니다.",
    category: "account",
  },
  {
    q: "악성 댓글의 원문은 항상 확인할 수 있나요?",
    a: "댓글은 플랜별 보관 기간 동안 저장됩니다. 증거 보관함에 따로 추가한 댓글은 보관 기간이 지나도 삭제되지 않고 계속 확인할 수 있습니다.",
    category: "evidence",
  },
  {
    q: "증거 보관함에는 어떤 내용이 저장되나요?",
    a: "댓글 내용, 작성자의 공개 채널ID·닉네임, AI 판정 근거가 저장됩니다. 작성자의 실명이나 구글 계정 정보 등 그 외 개인정보는 저장하지 않습니다.",
    category: "evidence",
  },
  {
    q: "여러 개의 채널을 동시에 연동할 수 있나요?",
    a: "플랜에 따라 연동 가능한 채널 수가 다릅니다. 무료·베이직은 1개, 플러스는 2개, 프로는 3개까지 연동할 수 있습니다.",
    category: "channel",
  },
  {
    q: "요금제는 언제든 변경할 수 있나요?",
    a: "네, 마이페이지의 구독 관리 화면에서 언제든지 플랜을 변경할 수 있습니다. 변경 내용은 화면 안내에 따라 적용됩니다.",
    category: "billing",
  },
];

function FaqItem({
  faq,
  isOpen,
  onToggle,
}: {
  faq: (typeof FAQS)[number];
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-black/[0.06] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[15px] font-bold text-[var(--landing-ink)]">
          {faq.q}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-[#8a9791] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      {isOpen && (
        <p className="pb-4 text-sm leading-relaxed text-[#5b6a61]">{faq.a}</p>
      )}
    </div>
  );
}

export function SupportHelpCenter() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(
    null,
  );
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filteredFaqs = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return FAQS.filter((faq) => {
      const matchesCategory =
        !activeCategory || faq.category === activeCategory;
      const matchesQuery =
        !normalized ||
        faq.q.toLowerCase().includes(normalized) ||
        faq.a.toLowerCase().includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <>
      <div className="px-6 pt-10 pb-6 md:pt-14">
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-full bg-white px-5 py-3.5 ring-1 ring-black/[0.06]">
          <Search className="size-4 shrink-0 text-[#8a9791]" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="궁금한 내용을 검색해 보세요 (예: 댓글 분석, 요금제, 채널 연동)"
            className="w-full text-sm text-[var(--landing-ink)] outline-none placeholder:text-[#8a9791]"
          />
        </div>
      </div>

      <section className="px-6 pt-4 pb-4 md:pt-6">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <EyebrowBadge>Help Center</EyebrowBadge>
                <h2 className="mt-3 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)]">
                  도움말 카테고리
                </h2>
              </div>
              <a
                href={`mailto:${CONTACT_EMAILS.support}`}
                className="text-sm font-semibold text-[#3e6856] hover:underline"
              >
                원하는 답을 찾지 못하셨나요? 이메일 문의하기
              </a>
            </div>
          </Reveal>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category, index) => {
              const isActive = activeCategory === category.key;
              return (
                <Reveal key={category.key} delay={index * 60} className="h-full">
                  <button
                    type="button"
                    onClick={() =>
                      setActiveCategory(isActive ? null : category.key)
                    }
                    className={`flex h-full w-full items-start gap-4 rounded-[2rem] px-6 py-6 text-left transition-all duration-300 ${
                      isActive
                        ? "bg-[var(--landing-forest)] shadow-[0_30px_60px_-30px_rgba(20,33,27,0.5)]"
                        : "bg-white ring-1 ring-black/[0.05] hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(20,33,27,0.3)]"
                    }`}
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${
                        isActive
                          ? "bg-[var(--landing-lime)] text-[var(--landing-ink)]"
                          : "bg-[var(--landing-ink)] text-[var(--landing-lime)]"
                      }`}
                    >
                      <category.icon className="size-5" />
                    </span>
                    <div>
                      <p
                        className={`text-sm font-extrabold ${
                          isActive ? "text-white" : "text-[var(--landing-ink)]"
                        }`}
                      >
                        {category.title}
                      </p>
                      <p
                        className={`mt-1 text-xs leading-relaxed ${
                          isActive ? "text-white/70" : "text-[#5b6a61]"
                        }`}
                      >
                        {category.body}
                      </p>
                    </div>
                  </button>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-6 py-12 md:py-16">
        <div className="mx-auto max-w-[1200px]">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <EyebrowBadge>FAQ</EyebrowBadge>
                <h2 className="mt-3 text-[clamp(24px,3vw,32px)] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)]">
                  자주 묻는 질문
                  {activeCategory && (
                    <span className="ml-2 text-sm font-medium text-[#5b6a61]">
                      · {CATEGORY_LABEL[activeCategory]}
                    </span>
                  )}
                </h2>
              </div>
              {activeCategory && (
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  className="text-sm font-semibold text-[#3e6856] hover:underline"
                >
                  전체 질문 보기
                </button>
              )}
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="mt-6 rounded-[2rem] bg-white px-6 ring-1 ring-black/[0.05] sm:px-7">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, index) => (
                  <FaqItem
                    key={faq.q}
                    faq={faq}
                    isOpen={openIndex === index}
                    onToggle={() =>
                      setOpenIndex(openIndex === index ? null : index)
                    }
                  />
                ))
              ) : (
                <p className="py-8 text-center text-sm text-[#5b6a61]">
                  검색 결과가 없습니다. 이메일로 문의해 주세요.
                </p>
              )}
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="mt-8 flex flex-col items-center gap-4 rounded-[2rem] bg-[var(--landing-lime)] px-8 py-8 text-center sm:flex-row sm:justify-between sm:text-left">
              <div className="flex items-center gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--landing-ink)] text-[var(--landing-lime)]">
                  <Mail className="size-5" />
                </span>
                <div>
                  <p className="text-[15px] font-extrabold text-[var(--landing-ink)]">
                    해결되지 않았나요?
                  </p>
                  <p className="mt-1 text-sm text-[var(--landing-ink)]/70">
                    더 궁금한 점이 있다면 언제든지 문의해 주세요. 영업일 기준
                    1~2일 이내 답변드립니다.
                  </p>
                </div>
              </div>
              <a
                href={`mailto:${CONTACT_EMAILS.support}`}
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[var(--landing-ink)] px-6 text-sm font-bold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--landing-forest)]"
              >
                이메일 문의하기 →
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
