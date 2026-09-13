import { redirect } from "next/navigation";

import { getAdminIdFromSession } from "@/lib/auth/admin-session";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const adminId = await getAdminIdFromSession();
  if (!adminId) {
    redirect("/admin/login");
  }

  return <>{children}</>;
}
