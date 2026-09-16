import { Caveat, Nunito } from "next/font/google";

export const wordmarkFont = Nunito({
  subsets: ["latin"],
  variable: "--font-wordmark",
});

// 랜딩페이지 CTA 카드의 손글씨 느낌 장식 문구 전용.
export const handwritingFont = Caveat({
  subsets: ["latin"],
  variable: "--font-handwriting",
});
