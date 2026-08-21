import { LegalPageLayout } from "@/components/landing/legal-page-layout";

export default function AboutPage() {
  return (
    <LegalPageLayout title="회사 소개">
      <section>
        <h2>왜 Reevely를 만들었나요</h2>
        <p>
          구독자가 늘어날수록 댓글창도 함께 커집니다. 하지만 구독자
          1만~50만 사이의 크리에이터 대부분은 소속사도 법무팀도 없이
          혼자, 혹은 아주 작은 팀으로 채널을 운영합니다. 위험한 댓글이
          와도 대응할 인력도 절차도 없는 경우가 많습니다. Reevely는 이
          공백을 메우기 위해 만들어졌습니다.
        </p>
      </section>

      <section>
        <h2>무엇을 하나요</h2>
        <p>
          유튜브 채널을 공식 API로 직접 연동해 댓글을 가져오고, AI가
          각 댓글의 위험도와 유형을 판정합니다. 크리에이터는 매번 댓글창을
          직접 훑어보는 대신, 위험도별로 정리된 화면에서 필요한 것만
          확인하면 됩니다.
        </p>
      </section>

      <section>
        <h2>오탐 관리를 가장 중요하게 생각합니다</h2>
        <p>
          AI가 확신하지 못한 댓글(확신도 0.7 미만)은 자동으로 확정하지
          않고 별도의 검토 큐로 분리합니다. 잘못된 확정보다 사람이 한 번
          더 확인하는 쪽을 택했습니다. 이 원칙은 앞으로도 바뀌지
          않습니다.
        </p>
      </section>

      <section>
        <h2>개인정보를 대하는 방식</h2>
        <p>
          댓글 작성자의 실명이나 구글 계정 정보는 저장하지 않습니다.
          공개된 채널ID와 채널 닉네임까지만 저장합니다. 자세한 내용은{" "}
          <a
            href="/privacy"
            className="text-primary underline underline-offset-2"
          >
            개인정보처리방침
          </a>
          에서 확인할 수 있습니다.
        </p>
      </section>
    </LegalPageLayout>
  );
}
