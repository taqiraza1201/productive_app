import { redirect } from "next/navigation";
import AdminPanel from "@/components/AdminPanel";
import { requireAdmin } from "@/lib/admin";

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/dashboard");

  return <AdminPanel />;
}
