import "server-only";

// refresh token이 취소/만료된 경우에만 던진다 — 사용자가 구글 쪽에서 앱 권한을
// 해제했거나 토큰이 완전히 무효화된 것이라 재연동 없이는 복구 불가능하다.
// 5xx나 네트워크 오류 등 일시적 실패와 구분해야 무한 재연동 요구를 피할 수 있다.
export class ReauthRequiredError extends Error {}

export async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    if (response.status === 400) {
      const body: { error?: string } = await response.json().catch(() => ({}));
      if (body.error === "invalid_grant") {
        throw new ReauthRequiredError(
          "refresh token이 만료되었거나 취소되어 재연동이 필요합니다.",
        );
      }
    }
    throw new Error(`Google 액세스 토큰 갱신 실패 (${response.status})`);
  }

  const data: { access_token: string } = await response.json();
  return data.access_token;
}
