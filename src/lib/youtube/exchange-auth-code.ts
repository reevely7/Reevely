import "server-only";

export async function exchangeAuthCodeForTokens(
  code: string,
  redirectUri: string,
) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`Google 인가 코드 교환 실패 (${response.status})`);
  }

  const data: { access_token: string; refresh_token?: string } =
    await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
  };
}
