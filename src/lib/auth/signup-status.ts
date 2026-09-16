import "server-only";

import type { User } from "@supabase/supabase-js";

export function isSignupCompleted(user: User) {
  return Boolean(user.user_metadata?.signup_completed_at);
}
