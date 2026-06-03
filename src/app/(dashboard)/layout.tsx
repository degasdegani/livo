// ============================================================
// LIVO — Dashboard Layout
// Verifica login E se a pessoa tem CRACHÁ (dono, recepção ou barbeiro)
// Sem crachá nenhum → onboarding
// Menu lateral centralizado aqui — herdado por todas as páginas
// ============================================================

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentMembership } from "@/lib/permissions";
import { MemberRole } from "@prisma/client";
import {
  BarChart2,
  CalendarDays,
  ClipboardList,
  DollarSign,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Settings,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

// ─── ITENS DO MENU ─────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  roleAccess?: MemberRole[];
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Início",
    icon: LayoutDashboard,
  },
  {
    href: "/dashboard/agenda",
    label: "Agenda",
    icon: CalendarDays,
  },
  {
    href: "/dashboard/clients",
    label: "Clientes",
    icon: Users,
  },
  {
    href: "/dashboard/produtos",
    label: "Produtos",
    icon: Package,
  },
  {
    href: "/dashboard/comandas",
    label: "Comandas",
    icon: ClipboardList,
  },
  {
    href: "/dashboard/comissoes",
    label: "Comissões",
    icon: DollarSign,
  },
  {
    href: "/dashboard/relatorios",
    label: "Relatórios",
    icon: BarChart2,
    roleAccess: [MemberRole.owner, MemberRole.reception],
  },
  {
    href: "/dashboard/marketing",
    label: "Marketing",
    icon: Megaphone,
    roleAccess: [MemberRole.owner, MemberRole.reception],
  },
  {
    href: "/dashboard/settings",
    label: "Configurações",
    icon: Settings,
    roleAccess: [MemberRole.owner],
  },
  {
    href: "/dashboard/settings/acessos",
    label: "Acessos",
    icon: UserCog,
    roleAccess: [MemberRole.owner],
  },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Está logado?
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // 2. Tem crachá?
  const membership = await getCurrentMembership();

  // 3. Sem crachá → onboarding
  if (!membership) redirect("/onboarding");

  // 4. Carrega a barbearia do crachá
  const barbershop = await db.barbershop.findUnique({
    where: { id: membership.barbershopId },
  });
  if (!barbershop) redirect("/onboarding");

  // 5. Filtra itens do menu pelo papel
  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roleAccess || item.roleAccess.includes(membership.role),
  );

  // 6. Renderiza
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#050505" }}>
      {/* ─── SIDEBAR ────────────────────────────────────────────────── */}
      <aside
        className="flex w-60 shrink-0 flex-col border-r"
        style={{ backgroundColor: "#0B0B0D", borderColor: "#2A2A33" }}
      >
        {/* Logo */}
        <div
          className="flex h-16 items-center px-6 border-b"
          style={{ borderColor: "#2A2A33" }}
        >
          <span className="text-xl font-bold tracking-tight text-white">
            LIVO
            <span style={{ color: "#C8102E" }}>TX</span>
          </span>
        </div>

        {/* Nome da barbearia e papel */}
        <div className="px-4 py-3 border-b" style={{ borderColor: "#2A2A33" }}>
          <p className="text-xs" style={{ color: "#6E6E78" }}>
            Barbearia
          </p>
          <p
            className="truncate text-sm font-semibold"
            style={{ color: "#9A9AA6" }}
          >
            {barbershop.name}
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#6E6E78" }}>
            {membership.role === MemberRole.owner
              ? "Dono"
              : membership.role === MemberRole.reception
                ? "Recepção"
                : "Barbeiro"}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
                    style={{ color: "#9A9AA6" }}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Rodapé: sair */}
        <div className="border-t p-3" style={{ borderColor: "#2A2A33" }}>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-white/5 hover:text-white"
            style={{ color: "#6E6E78" }}
          >
            <LogOut size={17} />
            Sair
          </Link>
        </div>
      </aside>

      {/* ─── CONTEÚDO PRINCIPAL ─────────────────────────────────────── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
