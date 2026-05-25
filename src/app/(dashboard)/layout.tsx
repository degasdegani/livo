// Layout do dashboard — protegido pelo middleware
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Proteção adicional no servidor (middleware já faz isso, mas é boa prática)
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#050505" }}>
      {children}
    </div>
  );
}
