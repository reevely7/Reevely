import { LegalPageLayout } from "@/components/landing/legal-page-layout";
import { CONTACT_EMAILS } from "@/lib/contact";

const PROPOSALS = [
  {
    title: "MCN·기획사 제휴",
    body: "소속 크리에이터 여러 명을 한 번에 관리해야 하는 MCN·기획사를 위한 협업을 논의합니다.",
  },
  {
    title: "플랫폼·툴 연동",
    body: "크리에이터 대상 서비스를 운영 중이라면, 데이터 연동이나 상호 노출 방식의 제휴를 검토할 수 있습니다.",
  },
  {
    title: "커뮤니티·미디어 협업",
    body: "크리에이터 대상 콘텐츠나 커뮤니티를 운영한다면 공동 캠페인, 인터뷰 등을 제안해 주세요.",
  },
];

export default function PartnershipPage() {
  return (
    <LegalPageLayout title="제휴 제안">
      <section>
        <p>
          Reevely는 소속사·법무팀 없이 채널을 운영하는 크리에이터들이 더
          안전하게 활동할 수 있는 생태계를 만들고자 합니다. 함께할 수
          있는 방법이 있다면 언제든 제안해 주세요.
        </p>
      </section>

      <section>
        <h2>이런 제휴를 환영합니다</h2>
        <div className="mt-3 flex flex-col gap-4">
          {PROPOSALS.map((item) => (
            <div key={item.title}>
              <p className="font-medium text-foreground">{item.title}</p>
              <p className="mt-1">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>제안하기</h2>
        <p>
          회사 소개, 제휴 형태, 기대 효과를 간단히 정리해서 아래
          이메일로 보내 주세요. 검토 후 회신드립니다.
        </p>
        <p>
          <a
            href={`mailto:${CONTACT_EMAILS.partnership}`}
            className="text-primary underline underline-offset-2"
          >
            {CONTACT_EMAILS.partnership}
          </a>
        </p>
      </section>
    </LegalPageLayout>
  );
}
