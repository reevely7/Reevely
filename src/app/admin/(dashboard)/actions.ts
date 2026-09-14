"use server";

import { redirect } from "next/navigation";

import { clearAdminSessionCookie } from "@/lib/auth/admin-session";

export async function logoutAdmin() {
  await clearAdminSessionCookie();
  redirect("/admin/login");
}
