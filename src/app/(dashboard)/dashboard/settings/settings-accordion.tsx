// src/app/(dashboard)/dashboard/settings/settings-accordion.tsx
"use client";

import type { BusinessHour, GoalPeriod, Service } from "@prisma/client";
import { ClipboardList, Clock, Lock, Scissors, Tv, User } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { BasicInfoForm } from "./basic-info-form";
import { BusinessHoursForm } from "./business-hours-form";
import { CoverPhotoForm } from "./cover-photo-form";
import { PersonalInfoForm } from "./personal-info-form";
import { PinForm } from "./pin-form";
import { ProfileLogoForm } from "./profile-logo-form";
import { ServicesManager } from "./services-manager";
import { TvGoalsSection } from "./tv-goals-section";

interface AccordionProps {
  user: {
    name: string;
    email: string;
    cpf: string | null;
    birthDate: Date | null;
    phone: string | null;
  };
  barbershop: {
    name: string;
    phone: string | null;
    city: string | null;
    cep: string | null;
    street: string | null;
    neighborhood: string | null;
    coverPhotoUrl: string | null;
    logoUrl: string | null;
    services: Service[];
    businessHours: BusinessHour[];
  };
  hasReopenPin: boolean;
  hasTv: boolean;
  tvData: {
    barbershopGoals: { period: GoalPeriod; targetInCents: number }[];
    professionals: {
      id: string;
      name: string;
      goals: { professionalId: string; period: GoalPeriod; targetServices: number }[];
    }[];
    tvPin: string | null;
    devices: { id: string; label: string | null; lastSeenAt: Date | null }[];
  };
}

type SectionId = "pessoal" | "barbearia" | "servicos" | "horarios" | "tv" | "seguranca";

const sections: { id: SectionId; label: string; icon: ReactNode }[] = [
  { id: "pessoal", label: "Dados Pessoais", icon: <User size={16} /> },
  { id: "barbearia", label: "Informações da Barbearia", icon: <Scissors size={16} /> },
  { id: "servicos", label: "Serviços", icon: <ClipboardList size={16} /> },
  { id: "horarios", label: "Horários de Funcionamento", icon: <Clock size={16} /> },
  { id: "tv", label: "Ranking TV", icon: <Tv size={16} /> },
  { id: "seguranca", label: "Segurança", icon: <Lock size={16} /> },
];

export function SettingsAccordion({
  user,
  barbershop,
  hasReopenPin,
  hasTv,
  tvData,
}: AccordionProps) {
  const [open, setOpen] = useState<SectionId>("pessoal");

  function toggle(id: SectionId) {
    setOpen((prev) => (prev === id ? ("" as SectionId) : id));
  }

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) => {
        const isOpen = open === section.id;
        return (
          <div
            key={section.id}
            className="rounded-2xl overflow-hidden"
            style={{
              border: `1px solid ${isOpen ? "var(--color-primary-20)" : "var(--border)"}`,
            }}
          >
            {/* Cabeçalho clicável */}
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center justify-between px-6 py-4 transition-colors"
              style={{
                backgroundColor: isOpen
                  ? "var(--color-primary-10)"
                  : "var(--bg-card)",
                textAlign: "left",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center" style={{ color: "var(--text-tertiary)" }}>{section.icon}</span>
                <div>
                  <p
                    className="text-sm font-bold"
                    style={{
                      color: isOpen
                        ? "var(--color-primary)"
                        : "var(--text-primary)",
                    }}
                  >
                    {section.label}
                  </p>
                </div>
              </div>
              <span
                style={{
                  color: isOpen
                    ? "var(--color-primary)"
                    : "var(--text-tertiary)",
                  fontSize: 18,
                  transition: "transform 200ms ease",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                  display: "inline-block",
                }}
              >
                ▾
              </span>
            </button>

            {/* Conteúdo expansível */}
            {isOpen && (
              <div style={{ borderTop: "1px solid var(--border)" }}>
                {section.id === "pessoal" && (
                  <PersonalInfoForm
                    name={user.name}
                    email={user.email}
                    cpf={user.cpf}
                    birthDate={user.birthDate}
                    phone={user.phone}
                  />
                )}
                {section.id === "barbearia" && (
                  <div className="flex flex-col gap-4 p-4">
                    <CoverPhotoForm coverPhotoUrl={barbershop.coverPhotoUrl} />
                    <ProfileLogoForm logoUrl={barbershop.logoUrl} />
                    <BasicInfoForm
                      name={barbershop.name}
                      phone={barbershop.phone || ""}
                      city={barbershop.city || ""}
                      cep={barbershop.cep || ""}
                      street={barbershop.street || ""}
                      neighborhood={barbershop.neighborhood || ""}
                    />
                  </div>
                )}
                {section.id === "servicos" && (
                  <ServicesManager services={barbershop.services} />
                )}
                {section.id === "horarios" && (
                  <BusinessHoursForm businessHours={barbershop.businessHours} />
                )}
                {section.id === "tv" && (
                  <div className="p-4">
                    {hasTv ? (
                      <TvGoalsSection
                        barbershopGoals={tvData.barbershopGoals}
                        professionals={tvData.professionals}
                        tvPin={tvData.tvPin}
                        devices={tvData.devices}
                      />
                    ) : (
                      <div
                        className="rounded-lg px-4 py-6 text-center"
                        style={{
                          backgroundColor: "var(--bg-card-elevated)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <p
                          className="text-sm font-semibold mb-1"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Disponível no plano PRO
                        </p>
                        <p className="text-xs mb-3" style={{ color: "var(--text-tertiary)" }}>
                          O Ranking TV (metas, PIN e dispositivos) faz parte do plano PRO.
                        </p>
                        <a
                          href="/dashboard/assinar"
                          className="text-xs font-bold"
                          style={{ color: "var(--color-primary)" }}
                        >
                          Fazer upgrade →
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {section.id === "seguranca" && (
                  <PinForm hasPin={hasReopenPin} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
