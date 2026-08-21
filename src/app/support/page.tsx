import { LegalPageLayout } from "@/components/landing/legal-page-layout";
import { CONTACT_EMAILS } from "@/lib/contact";

const FAQS = [
  {
    q: "왜 실시간으로 알림이 안 오나요?",
    a: "유튜브에는 댓글 관련 웹훅이 없어서, 최소 1시간 간격의 폴링 방식으로 확인합니다. 새 영상이 올라온 지 48시간 이내면 1시간마다, 아니면 6시간마다 확인합니다.",
  },
  {
    q: "AI가 위험하다고 판정했는데 아닌 것 같아요.",
    a: "대시보드에서 해당 댓글의 '오탐 신고' 버튼을 누르면 검토 대기 상태로 전환됩니다. 확신도가 낮은 판정은 애초에 자동으로 확정되지 않고 검토 큐로 분리됩니다.",
  },
  {
    q: "채널 연동을 해제하거나 계정을 삭제하고 싶어요.",
    a: "설정 페이지에서 직접 채널 연동 해제 및 계정 삭제(전체 데이터 영구 파기)를 진행할 수 있습니다.",
  },
];

export default function SupportPage() {
  return (
    <LegalPageLayout title="고객센터">
      <section>
        <h2>문의하기</h2>
        <p>
          서비스 이용 중 궁금한 점이나 문제가 있다면 아래 이메일로
          연락해 주세요. 영업일 기준 1~2일 이내 답변드립니다.
        </p>
        <p>
          <a
            href={`mailto:${CONTACT_EMAILS.support}`}
            className="text-primary underline underline-offset-2"
          >
            {CONTACT_EMAILS.support}
          </a>
        </p>
      </section>

      <section>
        <h2>자주 묻는 질문</h2>
        <div className="mt-3 flex flex-col gap-5">
          {FAQS.map((faq) => (
            <div key={faq.q}>
              <p className="font-medium text-foreground">Q. {faq.q}</p>
              <p className="mt-1">A. {faq.a}</p>
            </div>
          ))}
        </div>
      </section>
    </LegalPageLayout>
  );
}
