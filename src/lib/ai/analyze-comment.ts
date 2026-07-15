import "server-only";

import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 비용/속도 균형이 좋은 모델. 필요하면 이 상수만 바꾸면 됨.
const MODEL = "gpt-4o-mini";

export const CommentAnalysisSchema = z.object({
  is_malicious: z.boolean(),
  risk_level: z.enum(["high", "medium", "low"]),
  category: z.enum([
    "명예훼손",
    "허위사실",
    "성희롱",
    "인신공격",
    "비아냥",
    "기타",
    "해당없음",
  ]),
  confidence: z.number().min(0).max(1),
  reason: z.string(),
});

export type CommentAnalysis = z.infer<typeof CommentAnalysisSchema>;

const SYSTEM_PROMPT = `너는 유튜브 댓글의 악성 여부를 판정하는 분류기다.
단순히 부정적이거나 비판적인 의견, 콘텐츠에 대한 정당한 비판은 악성이 아니다.
명예훼손, 허위사실 유포, 성희롱, 인신공격, 노골적인 비아냥처럼 명백히
공격적인 댓글일 때만 is_malicious를 true로 판정하라.
맥락상 확신이 서지 않으면 confidence를 낮게(0.5 이하) 잡아라.
is_malicious가 false면 risk_level은 "low", category는 "해당없음"으로 답하라.`;

export async function analyzeComment(text: string): Promise<CommentAnalysis> {
  const completion = await openai.chat.completions.parse({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: text },
    ],
    // 판정 결과는 짧은 JSON 하나뿐이라 300이면 충분 — 폭주 비용 방어용 상한
    max_tokens: 300,
    response_format: zodResponseFormat(
      CommentAnalysisSchema,
      "comment_analysis",
    ),
  });

  const result = completion.choices[0]?.message.parsed;
  if (!result) {
    throw new Error("OpenAI가 판정 결과를 반환하지 않았습니다.");
  }
  return result;
}
