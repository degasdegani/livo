// src/app/(dashboard)/dashboard/settings/settings-accordion.tsx
"use client";

import type { BusinessHour, Service } from "@prisma/client";
import { useState } from "react";
import { BasicInfoForm } from "./basic-info-form";
import { BusinessHoursForm } from "./business-hours-form";
import { PersonalInfoForm } from "./personal-info-form";
import { ServicesManager } from "./services-manager";

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
    services: Service[];
    businessHours: BusinessHour[];
  };
}

const sections = [
  { id: "pessoal", label: "Dados Pessoais", icon: "👤" },
  { id: "barbearia", label: "Informações da Barbearia", icon: "✂️" },
  { id: "servicos", label: "Serviços", icon: "📋" },
  { id: "horarios", label: "Horários de Funcionamento", icon: "🕐" },
] as const;

type SectionId = (typeof sections)[number]["id"];

export function SettingsAccordion({ user, barbershop }: AccordionProps) {
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
                <span style={{ fontSize: 16 }}>{section.icon}</span>
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
                  <BasicInfoForm
                    name={barbershop.name}
                    phone={barbershop.phone || ""}
                    city={barbershop.city || ""}
                  />
                )}
                {section.id === "servicos" && (
                  <ServicesManager services={barbershop.services} />
                )}
                {section.id === "horarios" && (
                  <BusinessHoursForm businessHours={barbershop.businessHours} />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
