// src/app/(dashboard)/dashboard-layout-client.tsx
"use client";

import {
  BarChart2,
  CalendarDays,
  CreditCard,
  DollarSign,
  FileText,
  Gift,
  Home,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  Package,
  Scissors,
  Settings,
  Sparkles,
  Star,
  Sun,
  Tv,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { LiviaBubble } from "@/components/livia-bubble";
import { ProductSuggestionButton } from "@/components/product-suggestion-button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { ToastProvider } from "@/components/ui/toast";
import type { AppointmentAlert } from "@/hooks/use-appointment-alerts";
// `import type` é totalmente elidido no bundle — não arrasta @/lib/db (Prisma).
import type { ModuleKey } from "@/lib/modules";

type MemberRole = "owner" | "reception" | "barber";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: MemberRole[];
  // Módulo PRO-only associado; se ausente, o item é livre (START inclui).
  module?: ModuleKey;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: "Início",
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
    label: "Comissões",
    href: "/dashboard/comissoes",
    icon: <DollarSign size={18} />,
    roles: ["owner", "reception", "barber"],
    module: "comissoes",
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
    module: "marketing",
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    icon: <Sparkles size={18} />,
    roles: ["owner"],
    module: "insights",
  },
  {
    label: "Profissionais",
    href: "/dashboard/profissionais",
    icon: <Scissors size={18} />,
    roles: ["owner"],
    module: "profissionais",
  },
  {
    label: "Pacotes",
    href: "/dashboard/pacotes",
    icon: <Gift size={18} />,
    roles: ["owner"],
  },
  {
    label: "Faturamento",
    href: "/dashboard/faturamento",
    icon: <CreditCard size={18} />,
    roles: ["owner"],
  },
  {
    label: "Indicações",
    href: "/dashboard/indicacoes",
    icon: <Gift size={18} />,
    roles: ["owner"],
  },
  {
    label: "Configurações",
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
    >
      {theme === "dark" ? (
        <>
          <Sun
            size={18}
            style={{
              color: "var(--text-tertiary)",
              transition: "color 150ms ease",
            }}
            className="group-hover:text-gold!"
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

// Item de nav bloqueado (módulo PRO-only fora do plano). Mesmo padrão visual do
// cadeado do Clube: <div> inerte + pill à direita com <Lock/> — texto "PRO".
function LockedNavItem({ item }: { item: NavItem }) {
  return (
    <div
      title="Disponível no plano PRO"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.625rem 0.75rem",
        borderRadius: "0.5rem",
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "var(--text-tertiary)",
        border: "1px solid transparent",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <span style={{ color: "var(--text-tertiary)", flexShrink: 0, display: "flex" }}>
        {item.icon}
      </span>
      {item.label}
      <span
        style={{
          marginLeft: "auto",
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
          fontSize: "0.625rem",
          fontWeight: 600,
          background: "var(--bg-card-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "0.25rem",
          padding: "0.0625rem 0.3125rem",
          color: "var(--text-tertiary)",
        }}
      >
        <Lock size={9} />
        PRO
      </span>
    </div>
  );
}

function SidebarContent({
  role,
  pathname,
  theme,
  toggleTheme,
  onNavClick,
  clubEnabled,
  allowedModules,
}: {
  role: MemberRole;
  pathname: string;
  theme: "dark" | "light";
  toggleTheme: () => void;
  onNavClick?: () => void;
  clubEnabled: boolean;
  allowedModules: ModuleKey[];
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
          <div className="flex flex-col">
            <span
              style={{
                fontSize: "20px",
                fontWeight: 300,
                letterSpacing: "0.35em",
                color: "var(--text-primary)",
                lineHeight: 1.2,
              }}
            >
              L I V O
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.25em",
                color: "var(--text-tertiary)",
                marginLeft: "2px",
              }}
            >
              BARBER
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) =>
          item.module && !allowedModules.includes(item.module) ? (
            <LockedNavItem key={item.href} item={item} />
          ) : (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              onClick={onNavClick}
            />
          ),
        )}

        {/* ── Clube de Assinatura (somente owner) ─────────────── */}
        {role === "owner" &&
          (clubEnabled ? (
            <NavLink
              item={{
                label: "Clube",
                href: "/dashboard/clube",
                icon: <Star size={18} />,
                roles: ["owner"],
              }}
              pathname={pathname}
              onClick={onNavClick}
            />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.75rem",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "var(--text-tertiary)",
                border: "1px solid transparent",
                cursor: "default",
                userSelect: "none",
              }}
            >
              <Star size={18} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
              Clube
              <span
                style={{
                  marginLeft: "auto",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.25rem",
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  background: "var(--bg-card-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.25rem",
                  padding: "0.0625rem 0.3125rem",
                  color: "var(--text-tertiary)",
                }}
              >
                <Lock size={9} />
                Em breve
              </span>
            </div>
          ))}

        {/* ── Bônus ───────────────────────────────── */}
        <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
          {/* Label não-clicável */}
          <p style={{
            padding: "0 0.75rem",
            marginBottom: "0.25rem",
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}>
            Bonus
          </p>

          {/* LIVO TV — abre /tv em nova aba */}
          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.625rem 0.75rem",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--text-secondary)",
              textDecoration: "none",
              border: "1px solid transparent",
              transition: "background 150ms ease, color 150ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
            }}
          >
            <Tv size={18} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
            LIVO TV
          </a>
        </div>
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
        >
          <LogOut
            size={18}
            style={{
              color: "var(--text-tertiary)",
              transition: "color 150ms ease",
            }}
            className="group-hover:text-(--color-primary)!"
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
  barbershopName,
  alerts,
  clubEnabled,
  allowedModules,
}: {
  children: React.ReactNode;
  role: MemberRole;
  barbershopId: string;
  barbershopName: string;
  alerts: AppointmentAlert[];
  clubEnabled: boolean;
  allowedModules: ModuleKey[];
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
    <ToastProvider>
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
          clubEnabled={clubEnabled}
          allowedModules={allowedModules}
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
          clubEnabled={clubEnabled}
          allowedModules={allowedModules}
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
          <div className="flex items-center gap-1">
            <ProductSuggestionButton />
            <NotificationBell
              appointments={alerts}
              barbershopName={barbershopName}
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
          </div>
        </header>

        <header
          className="hidden lg:flex items-center justify-end gap-1 px-6 py-3 sticky top-0 z-30"
          style={{
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--bg-base)",
          }}
        >
          <ProductSuggestionButton />
          <NotificationBell
            appointments={alerts}
            barbershopName={barbershopName}
          />
        </header>

        <main className="flex-1">{children}</main>

        {allowedModules.includes("livia") && (
          <LiviaBubble barbershopId={barbershopId} barbershopName={barbershopName} />
        )}
      </div>
    </div>
    </ToastProvider>
  );
}
