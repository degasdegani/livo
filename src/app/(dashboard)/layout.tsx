// src/app/(dashboard)/layout.tsx
"use client";

import {
  BarChart2,
  CalendarDays,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Scissors,
  Settings,
  Users,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// ────────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────────

type MemberRole = "owner" | "reception" | "barber";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: MemberRole[];
}

// ────────────────────────────────────────────────────────────────
// Itens de navegação
// ────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard size={18} />,
    roles: ["owner", "reception", "barber"],
  },
  {
    label: "Agenda",
    href: "/dashboard/agenda",
    icon: <CalendarDays size={18} />,
    roles: ["owner", "reception", "barber"],
  },
  {
    label: "Clientes",
    href: "/dashboard/clients",
    icon: <Users size={18} />,
    roles: ["owner", "reception", "barber"],
  },
  {
    label: "Produtos",
    href: "/dashboard/produtos",
    icon: <Package size={18} />,
    roles: ["owner", "reception"],
  },
  {
    label: "Comandas",
    href: "/dashboard/comandas",
    icon: <FileText size={18} />,
    roles: ["owner", "reception", "barber"],
  },
  {
    label: "Comissões",
    href: "/dashboard/comissoes",
    icon: <DollarSign size={18} />,
    roles: ["owner", "reception", "barber"],
  },
  {
    label: "Relatórios",
    href: "/dashboard/relatorios",
    icon: <BarChart2 size={18} />,
    roles: ["owner", "reception"],
  },
  {
    label: "Marketing",
    href: "/dashboard/marketing",
    icon: <Megaphone size={18} />,
    roles: ["owner", "reception"],
  },
  {
    label: "Configurações",
    href: "/dashboard/settings",
    icon: <Settings size={18} />,
    roles: ["owner"],
  },
];

// ────────────────────────────────────────────────────────────────
// Componente de item do menu
// ────────────────────────────────────────────────────────────────

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  // Regra de active: "/dashboard" só é ativo se for exatamente "/dashboard"
  // "/dashboard/agenda" é ativo se pathname começa com "/dashboard/agenda"
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
        transition-all duration-150 group
        ${
          isActive
            ? "bg-[#C8102E]/15 text-[#C8102E] border border-[#C8102E]/20"
            : "text-[#9A9AA6] hover:bg-[#1F1F27] hover:text-white border border-transparent"
        }
      `}
    >
      <span
        className={`transition-colors ${
          isActive
            ? "text-[#C8102E]"
            : "text-[#6E6E78] group-hover:text-[#9A9AA6]"
        }`}
      >
        {item.icon}
      </span>
      {item.label}
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
      )}
    </Link>
  );
}

// ────────────────────────────────────────────────────────────────
// Sidebar conteúdo (reutilizado em desktop e mobile)
// ────────────────────────────────────────────────────────────────

function SidebarContent({
  role,
  pathname,
  onNavClick,
}: {
  role: MemberRole;
  pathname: string;
  onNavClick?: () => void;
}) {
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#2A2A33]">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5"
          onClick={onNavClick}
        >
          <div className="w-8 h-8 rounded-lg bg-[#C8102E] flex items-center justify-center flex-shrink-0">
            <Scissors size={16} className="text-white" />
          </div>
          <span className="text-lg font-black tracking-wider">
            <span className="text-white">LI</span>
            <span className="text-[#C8102E]">VO</span>
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onClick={onNavClick}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#2A2A33]">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
            text-[#9A9AA6] hover:bg-[#1F1F27] hover:text-[#C8102E]
            transition-all duration-150 w-full group"
        >
          <LogOut
            size={18}
            className="text-[#6E6E78] group-hover:text-[#C8102E] transition-colors"
          />
          Sair
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Layout principal
// ────────────────────────────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Fechar menu mobile ao trocar de rota
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Fechar menu mobile ao apertar Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Rola body quando menu mobile abre
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // IMPORTANTE: ajuste o role conforme sua lógica real.
  // Se você busca o role do membership via Server Component no layout pai,
  // passe via props ou context. Por ora, deixamos "owner" como default
  // para não quebrar o fluxo. Veja nota abaixo do arquivo.
  const role: MemberRole = "owner";

  return (
    <div className="min-h-screen bg-[#0B0B0D] flex">
      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#2A2A33] bg-[#0B0B0D]">
        <SidebarContent role={role} pathname={pathname} />
      </aside>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── SIDEBAR MOBILE ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 border-r border-[#2A2A33] bg-[#0B0B0D]
          transform transition-transform duration-300 ease-out lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Botão fechar dentro da sidebar */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6E6E78] hover:text-white hover:bg-[#1F1F27] transition-colors"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
        <SidebarContent
          role={role}
          pathname={pathname}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── CONTEÚDO PRINCIPAL ── */}
      <div className="flex-1 flex flex-col lg:ml-60">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-[#2A2A33] bg-[#0B0B0D] sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[#9A9AA6] hover:text-white hover:bg-[#1F1F27] transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-base font-black tracking-wider">
            <span className="text-white">LI</span>
            <span className="text-[#C8102E]">VO</span>
          </span>
          {/* Espaço para alinhar logo ao centro */}
          <div className="w-8" />
        </header>

        {/* Conteúdo da página */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
