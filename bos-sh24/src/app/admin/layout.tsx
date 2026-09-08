import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Sidebar } from "@/components/admin/Sidebar";
import { MobileTopbar } from "@/components/admin/MobileTopbar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || !can.accessAdmin(session.user.role)) {
    redirect("/login?callbackUrl=/admin");
  }

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-950">
      <div className="hidden lg:block">
        <Sidebar role={session.user.role} />
      </div>
      <div className="min-w-0 flex-1">
        <MobileTopbar role={session.user.role} />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
