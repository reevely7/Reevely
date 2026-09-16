// 포스터형 CTA 버튼 클래스 — 랜딩페이지와 회사소개·제휴제안·고객센터
// 서브페이지가 공유한다. 다크(잉크/포레스트) 배경 위에서는 CTA_ON_DARK,
// 화이트 배경 위에서는 CTA_ON_LIGHT를 쓴다.
export const CTA_ON_DARK =
  "h-[56px] w-auto rounded-full bg-[var(--landing-lime)] px-9 text-base font-extrabold text-[var(--landing-ink)] shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-white";
export const CTA_ON_LIGHT =
  "h-[56px] w-auto rounded-full bg-[var(--landing-ink)] px-9 text-base font-bold text-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--landing-forest)]";
// 다크 배경 위의 보조(아웃라인) 버튼 — 히어로의 "서비스 더 알아보기" 류
export const CTA_OUTLINE_ON_DARK =
  "h-[56px] w-auto rounded-full border-white/25 bg-transparent px-9 text-base font-bold text-white shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:text-white";
