import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// service_role 키를 쓰는 관리자 클라이언트 — 절대 브라우저에 노출 금지.
// 계정 완전 삭제(auth.admin.deleteUser)처럼 일반 클라이언트로는 못 하는 작업 전용.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
