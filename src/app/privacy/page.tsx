import { LegalPageLayout } from "@/components/landing/legal-page-layout";
import { CONTACT_EMAILS } from "@/lib/contact";

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="개인정보처리방침" updatedAt="2026.08.21 (초안)">
      <p className="rounded-md bg-risk-medium-bg px-3 py-2 text-xs text-risk-medium">
        이 방침은 서비스 정식 출시 전 초안입니다. 실제 수집 항목·목적은
        서비스 구현과 동일하게 유지되지만, 최종 문구는 법률 검토를 거쳐
        확정됩니다.
      </p>

      <section>
        <h2>1. 개인정보 최소 수집 원칙</h2>
        <p>
          Reevely는 회원(크리에이터)의 정보와, 회원 채널에 댓글을 남긴
          작성자의 정보를 서로 다른 기준으로 다룹니다. 특히 댓글
          작성자에 대해서는 실명, 이메일, 프로필 사진 등 개인을
          식별할 수 있는 정보를 일절 수집하지 않습니다. 유튜브에 공개된
          채널ID와, 작성자가 스스로 공개 설정한 채널 닉네임까지만
          저장합니다.
        </p>
      </section>

      <section>
        <h2>2. 수집하는 개인정보 항목</h2>
        <p>회원(서비스에 가입한 크리에이터)에 대해서는 다음을 수집합니다.</p>
        <ul>
          <li>구글 계정 이메일, 프로필 이름 (구글 로그인 시)</li>
          <li>연동한 유튜브 채널의 공개 정보 (채널명, 구독자 수, 썸네일)</li>
          <li>
            유튜브 API 접근을 위한 refresh token (암호화하여 저장하며,
            평문으로는 저장하지 않습니다)
          </li>
        </ul>
        <p>댓글 작성자에 대해서는 다음만 수집합니다.</p>
        <ul>
          <li>공개된 유튜브 채널ID</li>
          <li>작성자가 공개 설정한 채널 닉네임</li>
          <li>작성한 댓글 내용, 작성 일시</li>
        </ul>
      </section>

      <section>
        <h2>3. 개인정보의 수집 및 이용 목적</h2>
        <ul>
          <li>회원 식별 및 서비스 이용계약의 이행</li>
          <li>연동 채널의 댓글 수집·분석 및 위험도 판정</li>
          <li>대시보드를 통한 판정 결과 제공</li>
        </ul>
      </section>

      <section>
        <h2>4. 개인정보의 보유 및 이용 기간</h2>
        <p>
          회원 탈퇴 시 회원 정보, 연동 채널 정보, 수집·분석된 댓글
          데이터, 알림 데이터를 지체 없이 파기합니다. 관련 법령에 따라
          보존이 필요한 경우를 제외하고는 별도로 보관하지 않습니다.
        </p>
      </section>

      <section>
        <h2>5. 개인정보의 제3자 제공 및 처리 위탁</h2>
        <p>
          회사는 댓글 위험도 판정을 위해 OpenAI에 댓글 내용을 전송하여
          AI 분석을 위탁합니다. 그 외 개인정보를 제3자에게 제공하지
          않습니다.
        </p>
      </section>

      <section>
        <h2>6. 이용자의 권리</h2>
        <p>
          회원은 서비스 내 설정 페이지에서 언제든지 채널 연동 해제 및
          계정 삭제(전체 데이터 파기)를 직접 요청할 수 있습니다. 그 외
          문의는 아래 연락처로 접수합니다.
        </p>
      </section>

      <section>
        <h2>7. 개인정보 보호책임자</h2>
        <p>
          개인정보 관련 문의는{" "}
          <a
            href={`mailto:${CONTACT_EMAILS.support}`}
            className="text-primary underline underline-offset-2"
          >
            {CONTACT_EMAILS.support}
          </a>
          로 연락해 주세요.
        </p>
      </section>
    </LegalPageLayout>
  );
}
