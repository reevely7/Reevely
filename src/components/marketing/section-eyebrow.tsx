// 회사소개·제휴제안·고객센터 등 마케팅 서브페이지에서 섹션 상단에 쓰는
// 작은 트래킹 라벨. 랜딩 히어로의 알약형 EyebrowBadge와는 다른, 텍스트만
// 있는 스타일이다.
export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold tracking-[0.15em] text-primary uppercase">
      {children}
    </p>
  );
}
