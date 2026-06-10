// src/app/(dashboard)/dashboard-layout-client.tsx
"use client";

import {
  BarChart2,
  CalendarDays,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Package,
  Scissors,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { LiviaBubble } from "@/components/livia-bubble";

type MemberRole = "owner" | "reception" | "barber";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: MemberRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Inicio",
    href: "/dashboard",
    icon: <Home size={18} />,
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
    label: "Comissoes",
    href: "/dashboard/comissoes",
    icon: <DollarSign size={18} />,
    roles: ["owner", "reception", "barber"],
  },
  {
    label: "Relatorios",
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
    label: "Profissionais",
    href: "/dashboard/profissionais",
    icon: <Scissors size={18} />,
    roles: ["owner"],
  },
  {
    label: "Configuracoes",
    href: "/dashboard/settings",
    icon: <Settings size={18} />,
    roles: ["owner"],
  },
];

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("livo-theme") as "dark" | "light" | null;
    const initial = saved ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("livo-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return { theme, toggle };
}

function NavLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      onClick={onClick}
      style={
        isActive
          ? {
              backgroundColor: "var(--color-primary-10)",
              color: "var(--color-primary)",
              border: "1px solid var(--color-primary-20)",
            }
          : {
              color: "var(--text-secondary)",
              border: "1px solid transparent",
            }
      }
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group nav-link"
    >
      <span
        style={{
          color: isActive ? "var(--color-primary)" : "var(--text-tertiary)",
          transition: "color 150ms ease",
        }}
      >
        {item.icon}
      </span>
      {item.label}
      {isActive && (
        <span
          className="ml-auto w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: "var(--color-primary)" }}
        />
      )}
    </Link>
  );
}

function ThemeToggle({
  theme,
  toggle,
}: {
  theme: "dark" | "light";
  toggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={toggle}
      title={
        theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"
      }
      className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium w-full nav-link transition-all duration-150 group border border-transparent"
      style={{ color: "var(--text-secondary)" }}
    >
      {theme === "dark" ? (
        <>
          <Sun
            size={18}
            style={{
              color: "var(--text-tertiary)",
              transition: "color 150ms ease",
            }}
            className="group-hover:!text-[#d4af37]"
          />
          <span>Tema claro</span>
        </>
      ) : (
        <>
          <Moon
            size={18}
            style={{
              color: "var(--text-tertiary)",
              transition: "color 150ms ease",
            }}
          />
          <span>Tema escuro</span>
        </>
      )}
    </button>
  );
}

function SidebarContent({
  role,
  pathname,
  theme,
  toggleTheme,
  onNavClick,
}: {
  role: MemberRole;
  pathname: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
  onNavClick?: () => void;
}) {
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link
          href="/dashboard"
          className="flex items-center"
          onClick={onNavClick}
        >
          <Image
            src={theme === "light" ? "/logo-livo-light.svg" : "/logo-livo.svg"}
            alt="LIVO"
            width={120}
            height={32}
            priority
          />
        </Link>
      </div>

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

      <div
        className="px-3 py-4 space-y-1"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <ThemeToggle theme={theme} toggle={toggleTheme} />
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium nav-link transition-all duration-150 w-full group border border-transparent"
          style={{ color: "var(--text-secondary)" }}
        >
          <LogOut
            size={18}
            style={{
              color: "var(--text-tertiary)",
              transition: "color 150ms ease",
            }}
            className="group-hover:!text-[var(--color-primary)]"
          />
          Sair
        </button>
      </div>
    </div>
  );
}

export function DashboardLayoutClient({
  children,
  role,
  barbershopId,
}: {
  children: React.ReactNode;
  role: MemberRole;
  barbershopId: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname triggers menu close on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: "var(--bg-base)" }}
      data-theme={theme}
    >
      <aside
        className="hidden lg:flex lg:w-60 lg:flex-col lg:fixed lg:inset-y-0"
        style={{
          borderRight: "1px solid var(--border)",
          backgroundColor: "var(--bg-sidebar)",
        }}
      >
        <SidebarContent
          role={role}
          pathname={pathname}
          theme={theme}
          toggleTheme={toggle}
        />
      </aside>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-40 lg:hidden backdrop-blur-sm border-none outline-none p-0 cursor-default"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72
          transform transition-transform duration-300 ease-out lg:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          borderRight: "1px solid var(--border)",
          backgroundColor: "var(--bg-sidebar)",
        }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-tertiary)" }}
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
        <SidebarContent
          role={role}
          pathname={pathname}
          theme={theme}
          toggleTheme={toggle}
          onNavClick={() => setMobileOpen(false)}
        />
      </aside>

      <div className="flex-1 flex flex-col lg:ml-60">
        <header
          className="lg:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-30"
          style={{
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--bg-sidebar)",
          }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>
          <Image
            src="/logo-icon.svg"
            alt="LIVO"
            width={32}
            height={32}
            priority
          />
          <button
            type="button"
            onClick={toggle}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-secondary)" }}
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <main className="flex-1">{children}</main>

        <LiviaBubble barbershopId={barbershopId} />
      </div>
    </div>
  );
}
