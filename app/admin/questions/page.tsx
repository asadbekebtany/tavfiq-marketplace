import { AdminQuestionsClient } from "@/components/admin/admin-questions-client";
import { requireAdminPage } from "@/lib/page-auth";

export const metadata = { title: "Savol-javob" };

export default async function AdminQuestionsPage() {
  await requireAdminPage("/admin/questions");
  return <AdminQuestionsClient />;
}
