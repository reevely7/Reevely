import { redirect } from "next/navigation";

import { logoutAdmin } from "@/app/admin/(dashboard)/actions";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
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

  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <AdminSidebar logoutAction={logoutAdmin} />
      <div className="flex flex-1 flex-col overflow-y-auto bg-background">{children}</div>
    </div>
  );
}
