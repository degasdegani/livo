// src/app/(dashboard)/dashboard/marketing/marketing-client.tsx
"use client";

import { useState, useTransition } from "react";
import {
  getClientesSumidos,
  type Aniversariante,
  type ClienteSumido,
  type DiasSumido,
} from "./actions";

function sanitizarTelefone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    return digits;
  }
  return `55${digits}`;
}

function gerarLinkWhatsApp(
  phone: string | null,
  mensagem: string,
): string | null {
  const numero = sanitizarTelefone(phone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function formatarData(date: Date | null): string {
  if (!date) return "Nunca visitou";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

function diasDesdeVisita(date: Date | null): string {
  if (!date) return "—";
  const hoje = new Date();
  const visita = new Date(date);
  const diff = Math.floor(
    (hoje.getTime() - visita.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "hoje";
  if (diff === 1) return "ontem";
  return `há ${diff} dias`;
}

function nomeMesAtual(): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date());
}

const whatsappIconPath =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z";

type Props = {
  sumidosIniciais: ClienteSumido[];
  aniversariantesIniciais: Aniversariante[];
  nomeBarberaria: string;
};

export function MarketingClient({
  sumidosIniciais,
  aniversariantesIniciais,
  nomeBarberaria,
}: Props) {
  const [aba, setAba] = useState<"sumidos" | "aniversariantes">("sumidos");
  const [diasSumido, setDiasSumido] = useState<DiasSumido>(30);
  const [sumidos, setSumidos] = useState<ClienteSumido[]>(sumidosIniciais);
  const [aniversariantes] = useState<Aniversariante[]>(aniversariantesIniciais);
  const [isPending, startTransition] = useTransition();

  function handleChangeDias(novosDias: DiasSumido) {
    setDiasSumido(novosDias);
    startTransition(async () => {
      const novos = await getClientesSumidos(novosDias);
      setSumidos(novos);
    });
  }

  const mes = nomeMesAtual();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
      }}
    >
      {/* HEADER */}
      <div style={{ padding: "32px 32px 0 32px" }}>
        <h1
          style={{
            fontSize: "24px",
            fontWeight: 700,
            margin: 0,
            color: "var(--text-primary)",
          }}
        >
          Marketing & Retenção
        </h1>
        <p
          style={{
            color: "var(--text-secondary)",
            marginTop: "8px",
            fontSize: "14px",
          }}
        >
          Reconquiste clientes sumidos e celebre aniversariantes — direto pelo
          WhatsApp.
        </p>
      </div>

      {/* ABAS */}
      <div
        style={{
          padding: "24px 32px 0 32px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 0,
        }}
      >
        <button
          onClick={() => setAba("sumidos")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: aba === "sumidos" ? 600 : 400,
            color:
              aba === "sumidos"
                ? "var(--text-primary)"
                : "var(--text-secondary)",
            borderBottom:
              aba === "sumidos"
                ? "2px solid var(--color-primary)"
                : "2px solid transparent",
            transition: "all 0.15s",
          }}
        >
          😴 Clientes Sumidos
          <span
            style={{
              marginLeft: "8px",
              backgroundColor:
                aba === "sumidos"
                  ? "var(--color-primary)"
                  : "var(--bg-card-elevated)",
              color: "var(--text-primary)",
              borderRadius: "10px",
              padding: "1px 8px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {sumidos.length}
          </span>
        </button>

        <button
          onClick={() => setAba("aniversariantes")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: aba === "aniversariantes" ? 600 : 400,
            color:
              aba === "aniversariantes"
                ? "var(--text-primary)"
                : "var(--text-secondary)",
            borderBottom:
              aba === "aniversariantes"
                ? "2px solid var(--color-gold)"
                : "2px solid transparent",
            transition: "all 0.15s",
          }}
        >
          🎂 Aniversariantes
          <span
            style={{
              marginLeft: "8px",
              backgroundColor:
                aba === "aniversariantes"
                  ? "var(--color-gold)"
                  : "var(--bg-card-elevated)",
              color:
                aba === "aniversariantes"
                  ? "var(--bg-base)"
                  : "var(--text-primary)",
              borderRadius: "10px",
              padding: "1px 8px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {aniversariantes.length}
          </span>
        </button>
      </div>

      {/* CONTEÚDO */}
      <div style={{ padding: "24px 32px" }}>
        {/* ─── ABA: CLIENTES SUMIDOS ─── */}
        {aba === "sumidos" && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "24px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{ color: "var(--text-secondary)", fontSize: "14px" }}
              >
                Mostrar clientes sem visita há mais de:
              </span>
              {([30, 60, 90] as DiasSumido[]).map((d) => (
                <button
                  key={d}
                  onClick={() => handleChangeDias(d)}
                  disabled={isPending}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    border:
                      diasSumido === d
                        ? "1px solid var(--color-primary)"
                        : "1px solid var(--border)",
                    backgroundColor:
                      diasSumido === d ? "var(--color-primary)" : "transparent",
                    color: "var(--text-primary)",
                    cursor: isPending ? "wait" : "pointer",
                    fontSize: "13px",
                    fontWeight: diasSumido === d ? 600 : 400,
                    transition: "all 0.15s",
                    opacity: isPending ? 0.6 : 1,
                  }}
                >
                  {d} dias
                </button>
              ))}
              {isPending && (
                <span
                  style={{ color: "var(--text-tertiary)", fontSize: "13px" }}
                >
                  Atualizando...
                </span>
              )}
            </div>

            {sumidos.length === 0 ? (
              <EstadoVazio
                icone="🎉"
                titulo="Nenhum cliente sumido!"
                descricao={`Todos os seus clientes visitaram a barbearia nos últimos ${diasSumido} dias.`}
              />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "1px" }}
              >
                {/* Cabeçalho */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 140px 120px 1fr",
                    padding: "10px 16px",
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "8px 8px 0 0",
                    border: "1px solid var(--border)",
                    borderBottom: "none",
                  }}
                >
                  {["Cliente", "Última visita", "Visitas", ""].map((h, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "12px",
                        color: "var(--text-tertiary)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        textAlign: i === 3 ? "right" : "left",
                      }}
                    >
                      {h || "Ação"}
                    </span>
                  ))}
                </div>

                {sumidos.map((cliente, idx) => {
                  const mensagem = `Olá ${cliente.name}! 👋 Tô com saudade de você aqui na ${nomeBarberaria}. Que tal agendar um horário? 💈`;
                  const link = gerarLinkWhatsApp(cliente.phone, mensagem);
                  const isUltimo = idx === sumidos.length - 1;

                  return (
                    <div
                      key={cliente.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 140px 120px 1fr",
                        padding: "14px 16px",
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderTop: "none",
                        borderRadius: isUltimo ? "0 0 8px 8px" : "0",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                          }}
                        >
                          {cliente.name}
                        </p>
                        {cliente.phone && (
                          <p
                            style={{
                              margin: 0,
                              fontSize: "12px",
                              color: "var(--text-tertiary)",
                              marginTop: "2px",
                            }}
                          >
                            {cliente.phone}
                          </p>
                        )}
                      </div>

                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "13px",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {formatarData(cliente.lastVisitAt)}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "var(--color-primary)",
                            marginTop: "2px",
                            fontWeight: 500,
                          }}
                        >
                          {diasDesdeVisita(cliente.lastVisitAt)}
                        </p>
                      </div>

                      <div>
                        <span
                          style={{
                            fontSize: "13px",
                            color:
                              cliente.totalVisits === 0
                                ? "var(--text-tertiary)"
                                : "var(--text-secondary)",
                          }}
                        >
                          {cliente.totalVisits === 0
                            ? "Nunca veio"
                            : `${cliente.totalVisits}x`}
                        </span>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "7px 14px",
                              backgroundColor: "#25D366",
                              color: "#FFFFFF",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 600,
                              textDecoration: "none",
                              transition: "opacity 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.opacity = "0.85")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.opacity = "1")
                            }
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d={whatsappIconPath} />
                            </svg>
                            Chamar
                          </a>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            Sem telefone
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── ABA: ANIVERSARIANTES ─── */}
        {aba === "aniversariantes" && (
          <div>
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "14px 18px",
                marginBottom: "24px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span style={{ fontSize: "24px" }}>🎂</span>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                  }}
                >
                  Aniversariantes de {mes}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "13px",
                    color: "var(--text-secondary)",
                    marginTop: "3px",
                  }}
                >
                  {aniversariantes.length === 0
                    ? "Nenhum cliente com data de aniversário cadastrada para este mês."
                    : `${aniversariantes.length} cliente${aniversariantes.length > 1 ? "s" : ""} faz${aniversariantes.length > 1 ? "em" : ""} aniversário este mês. Mande uma mensagem e fidelize!`}
                </p>
              </div>
            </div>

            {aniversariantes.length === 0 ? (
              <EstadoVazio
                icone="📅"
                titulo="Nenhum aniversariante este mês"
                descricao="Clientes precisam ter a data de nascimento cadastrada no CRM para aparecer aqui."
              />
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: "1px" }}
              >
                {/* Cabeçalho */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "60px 1fr 1fr",
                    padding: "10px 16px",
                    backgroundColor: "var(--bg-card)",
                    borderRadius: "8px 8px 0 0",
                    border: "1px solid var(--border)",
                    borderBottom: "none",
                  }}
                >
                  {["Dia", "Cliente", "Ação"].map((h, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: "12px",
                        color: "var(--text-tertiary)",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        textAlign: i === 2 ? "right" : "left",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {aniversariantes.map((cliente, idx) => {
                  const hoje = new Date();
                  const diaHoje = hoje.getDate();
                  const eHoje = cliente.diaMes === diaHoje;
                  const isUltimo = idx === aniversariantes.length - 1;
                  const anoNascimento = new Date(
                    cliente.birthDate,
                  ).getFullYear();
                  const idadeCompleta = hoje.getFullYear() - anoNascimento;
                  const mensagem = `Feliz aniversário, ${cliente.name}! 🎉🎂 A equipe da ${nomeBarberaria} deseja um dia incrível pra você! Que tal comemorar com um corte especial? 💈`;
                  const link = gerarLinkWhatsApp(cliente.phone, mensagem);

                  return (
                    <div
                      key={cliente.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "60px 1fr 1fr",
                        padding: "14px 16px",
                        backgroundColor: eHoje
                          ? "rgba(212,175,55,0.06)"
                          : "var(--bg-card)",
                        border: `1px solid ${eHoje ? "var(--color-gold)" : "var(--border)"}`,
                        borderTop: "none",
                        borderRadius: isUltimo ? "0 0 8px 8px" : "0",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: eHoje
                              ? "var(--color-gold)"
                              : "var(--bg-card-elevated)",
                            color: eHoje
                              ? "var(--bg-base)"
                              : "var(--text-secondary)",
                            fontSize: "14px",
                            fontWeight: 700,
                          }}
                        >
                          {cliente.diaMes}
                        </span>
                        {eHoje && (
                          <p
                            style={{
                              margin: "4px 0 0 0",
                              fontSize: "10px",
                              color: "var(--color-gold)",
                              fontWeight: 600,
                            }}
                          >
                            HOJE!
                          </p>
                        )}
                      </div>

                      <div>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: 500,
                            color: eHoje
                              ? "var(--color-gold)"
                              : "var(--text-primary)",
                          }}
                        >
                          {eHoje && "🎉 "}
                          {cliente.name}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "var(--text-tertiary)",
                            marginTop: "2px",
                          }}
                        >
                          {idadeCompleta} anos •{" "}
                          {cliente.phone ?? "Sem telefone"}
                        </p>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        {link ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "7px 14px",
                              backgroundColor: eHoje
                                ? "var(--color-gold)"
                                : "#25D366",
                              color: eHoje ? "var(--bg-base)" : "#FFFFFF",
                              borderRadius: "6px",
                              fontSize: "13px",
                              fontWeight: 600,
                              textDecoration: "none",
                              transition: "opacity 0.15s",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.opacity = "0.85")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.opacity = "1")
                            }
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d={whatsappIconPath} />
                            </svg>
                            {eHoje ? "Parabenizar agora!" : "Parabenizar"}
                          </a>
                        ) : (
                          <span
                            style={{
                              fontSize: "12px",
                              color: "var(--text-tertiary)",
                            }}
                          >
                            Sem telefone
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EstadoVazio({
  icone,
  titulo,
  descricao,
}: {
  icone: string;
  titulo: string;
  descricao: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 32px",
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        textAlign: "center",
      }}
    >
      <span style={{ fontSize: "40px", marginBottom: "16px" }}>{icone}</span>
      <p
        style={{
          margin: 0,
          fontSize: "16px",
          fontWeight: 600,
          color: "var(--text-primary)",
        }}
      >
        {titulo}
      </p>
      <p
        style={{
          margin: "8px 0 0 0",
          fontSize: "14px",
          color: "var(--text-secondary)",
          maxWidth: "400px",
        }}
      >
        {descricao}
      </p>
    </div>
  );
}
