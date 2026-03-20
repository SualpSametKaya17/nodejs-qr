import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardNav from "@/components/dashboard/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardNav restaurantName={session.name} />
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  );
}
