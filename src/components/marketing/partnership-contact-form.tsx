"use client";

import { useState } from "react";

import { EyebrowBadge } from "@/components/landing/eyebrow-badge";
import { CONTACT_EMAILS } from "@/lib/contact";

const MAX_LENGTH = 1000;

const COLLABORATION_TYPES = [
  "MCN·기획사 제휴",
  "플랫폼·서비스 연동",
  "커뮤니티·미디어 협업",
  "기타",
];

const INPUT_CLASS =
  "w-full rounded-xl border border-black/10 px-3.5 py-2.5 text-sm text-[var(--landing-ink)] outline-none transition-colors focus:border-[var(--landing-forest)]";

// 별도 백엔드 없이 mailto 링크로 메일 클라이언트를 열어 제안 내용을
// 전달한다 — 이 서비스에는 아직 제휴 문의를 저장할 DB 테이블이 없다.
export function PartnershipContactForm() {
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState(COLLABORATION_TYPES[0]);
  const [message, setMessage] = useState("");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const subject = `[제휴 제안] ${companyName || "회사명 미입력"}`;
    const body = [
      `회사명/단체명: ${companyName}`,
      `담당자명: ${contactName}`,
      `이메일 주소: ${email}`,
      `협업 유형: ${type}`,
      "",
      "제안 내용:",
      message,
    ].join("\n");

    window.location.href = `mailto:${CONTACT_EMAILS.partnership}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] bg-white p-7 ring-1 ring-black/[0.05] sm:p-9"
    >
      <EyebrowBadge>Get in Touch</EyebrowBadge>
      <h3 className="mt-4 text-[clamp(26px,3vw,34px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-[var(--landing-ink)]">
        제안하기
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#5b6a61]">
        좋은 아이디어가 있으신가요? 함께 더 안전한 창작 생태계를 만들어갈
        파트너를 기다립니다. 아래 양식을 작성해주시면 빠르게 검토하여
        답변드리겠습니다.
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--landing-ink)]">
            회사명 / 단체명 <span className="text-[#3e6856]">*</span>
          </span>
          <input
            type="text"
            required
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
            placeholder="예: 리블리 엔터테인먼트"
            className={INPUT_CLASS}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--landing-ink)]">
            담당자명 <span className="text-[#3e6856]">*</span>
          </span>
          <input
            type="text"
            required
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder="이름을 입력해주세요"
            className={INPUT_CLASS}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--landing-ink)]">
            이메일 주소 <span className="text-[#3e6856]">*</span>
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            className={INPUT_CLASS}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-semibold text-[var(--landing-ink)]">
            협업 유형 <span className="text-[#3e6856]">*</span>
          </span>
          <select
            required
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={`${INPUT_CLASS} bg-white`}
          >
            {COLLABORATION_TYPES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm sm:col-span-2">
          <span className="mb-1.5 block font-semibold text-[var(--landing-ink)]">
            제안 내용 <span className="text-[#3e6856]">*</span>
          </span>
          <textarea
            required
            rows={5}
            maxLength={MAX_LENGTH}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="제휴 제안 내용을 자유롭게 작성해주세요. (목표, 협업 방식, 기대 효과 등)"
            className={`${INPUT_CLASS} resize-none`}
          />
          <span className="mt-1 block text-right text-xs text-[#8a9791]">
            {message.length} / {MAX_LENGTH}
          </span>
        </label>
      </div>

      <button
        type="submit"
        className="mt-2 flex h-[56px] w-full items-center justify-center gap-1.5 rounded-full bg-[var(--landing-ink)] px-6 text-base font-bold text-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--landing-forest)]"
      >
        제휴 제안 보내기 →
      </button>
    </form>
  );
}
