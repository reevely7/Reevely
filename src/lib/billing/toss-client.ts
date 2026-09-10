import "server-only";

// 토스 API는 시크릿 키 뒤에 ':'을 붙여 base64 인코딩한 값을 Basic 인증으로 쓴다.
function authHeader(): string {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    throw new Error("TOSS_SECRET_KEY 환경변수가 설정되지 않았습니다.");
  }
  return "Basic " + Buffer.from(`${secretKey}:`).toString("base64");
}

type IssueBillingKeyResponse = {
  billingKey: string;
};

// 카드 등록 인증창 완료 후 받은 authKey를 실제 빌링키로 교환한다.
export async function issueBillingKey(
  authKey: string,
  customerKey: string,
): Promise<{ billingKey: string }> {
  const response = await fetch(
    "https://api.tosspayments.com/v1/billing/authorizations/issue",
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ authKey, customerKey }),
    },
  );

  if (!response.ok) {
    throw new Error(`토스 빌링키 발급 실패 (${response.status})`);
  }

  const data: IssueBillingKeyResponse = await response.json();
  return { billingKey: data.billingKey };
}

export type TossChargeResult =
  | { success: true; tossPaymentKey: string }
  | { success: false; failReason: string };

type TossErrorResponse = { code: string; message: string };

// 빌링키로 실제 결제를 승인(청구)한다. 실패해도 throw하지 않고 결과 타입으로 구분 —
// 호출부(cron/체크아웃)가 payment_history 기록과 상태 전이를 직접 분기해야 하기 때문.
export async function chargeBilling(params: {
  billingKey: string;
  customerKey: string;
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<TossChargeResult> {
  const response = await fetch(
    `https://api.tosspayments.com/v1/billing/${params.billingKey}`,
    {
      method: "POST",
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customerKey: params.customerKey,
        amount: params.amount,
        orderId: params.orderId,
        orderName: params.orderName,
        taxFreeAmount: 0,
      }),
    },
  );

  if (!response.ok) {
    const error: TossErrorResponse = await response.json();
    return { success: false, failReason: `${error.code}: ${error.message}` };
  }

  const data: { paymentKey: string; status: string } = await response.json();
  return { success: true, tossPaymentKey: data.paymentKey };
}
