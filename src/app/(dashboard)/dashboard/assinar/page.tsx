// src/app/(dashboard)/dashboard/assinar/page.tsx
"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createSubscription } from "./actions";

function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return d.replace(/(\d{3})(\d{0,3})/, "$1.$2");
  if (d.length <= 9) return d.replace(/(\d{3})(\d{3})(\d{0,3})/, "$1.$2.$3");
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, "$1.$2.$3-$4");
}

function SubmitButton({ billingType }: { billingType: "monthly" | "yearly" }) {
  const { pending } = useFormStatus();
  const label =
    billingType === "yearly"
      ? "Assinar PRO Anual — R$ 1.997/ano →"
      : "Assinar PRO Mensal — R$ 197/mês →";
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-4 rounded-xl font-black text-white text-base transition-all hover:opacity-90 disabled:opacity-50"
      style={{
        background: "var(--color-primary)",
        boxShadow: "0 8px 32px rgba(200,16,46,0.3)",
      }}
    >
      {pending ? "Processando..." : label}
    </button>
  );
}

export default function AssinarPage() {
  const [state, action] = useActionState(createSubscription, null);
  const [cpf, setCpf] = useState("");
  const [billingType, setBillingType] = useState<"monthly" | "yearly">(
    "monthly",
  );

  const monthlyPrice = 197;
  const yearlyPrice = 1997;
  const yearlyMonthly = Math.round(yearlyPrice / 12);
  const yearlySaving = monthlyPrice * 12 - yearlyPrice;

  if (state?.success && state.pixPayload) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "var(--color-primary)",
                display: "inline-block",
              }}
            />
            <span
              className="font-black"
              style={{ fontSize: "20px", color: "var(--text-primary)" }}
            >
              LIVO
            </span>
          </div>
          <div>
            <h2
              className="font-black mb-2"
              style={{ fontSize: "24px", color: "var(--text-primary)" }}
            >
              Pague com PIX
            </h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Escaneie o QR Code ou copie o código abaixo
            </p>
          </div>
          {state.pixImage && (
            <div className="p-4 rounded-2xl" style={{ background: "#FFFFFF" }}>
              <img
                src={`data:image/png;base64,${state.pixImage}`}
                alt="QR Code PIX"
                width={200}
                height={200}
              />
            </div>
          )}
          <div className="w-full">
            <p
              className="text-xs mb-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Código PIX (copia e cola):
            </p>
            <div
              className="p-3 rounded-xl text-xs break-all cursor-pointer"
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-secondary)",
                fontFamily: "monospace",
              }}
              onClick={() => {
                navigator.clipboard.writeText(state.pixPayload || "");
                alert("Código copiado!");
              }}
            >
              {state.pixPayload?.slice(0, 60)}...
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              Clique para copiar o código completo
            </p>
          </div>
          <div
            className="w-full p-4 rounded-xl"
            style={{
              backgroundColor: "rgba(63,185,80,0.08)",
              border: "1px solid rgba(63,185,80,0.2)",
            }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--status-green)" }}
            >
              ✓ Após o pagamento, seu acesso será liberado automaticamente.
            </p>
          </div>
          {state.invoiceUrl && (
            <a
              href={state.invoiceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-tertiary)" }}
            >
              Abrir fatura completa →
            </a>
          )}
        </div>
      </main>
    );
  }

  if (state?.success && state.invoiceUrl) {
    return (
      <main
        className="min-h-screen flex items-center justify-center p-6"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
          <div className="text-5xl">✅</div>
          <h2
            className="font-black"
            style={{ fontSize: "24px", color: "var(--text-primary)" }}
          >
            Assinatura criada!
          </h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Acesse o link abaixo para finalizar o pagamento.
          </p>
          <a
            href={state.invoiceUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-4 rounded-xl font-black text-white text-center transition-all hover:opacity-80 block"
            style={{ background: "var(--color-primary)" }}
          >
            Ir para o pagamento →
          </a>
          <a
            href="/dashboard"
            className="text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            Voltar ao dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--bg-base)" }}
    >
      <div className="w-full max-w-md flex flex-col gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--color-primary)",
              display: "inline-block",
            }}
          />
          <span
            className="font-black"
            style={{ fontSize: "20px", color: "var(--text-primary)" }}
          >
            LIVO
          </span>
        </div>

        {/* Headline */}
        <div>
          <h1
            className="font-black mb-2"
            style={{
              fontSize: "32px",
              letterSpacing: "-1px",
              color: "var(--text-primary)",
            }}
          >
            Seu trial chegou
            <br />
            <span style={{ color: "var(--color-primary)" }}>ao fim.</span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Assine o LIVO PRO para continuar gerenciando sua barbearia.
          </p>
        </div>

        {/* Toggle mensal/anual */}
        <div
          className="flex gap-1 rounded-xl p-1"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => setBillingType("monthly")}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
            style={
              billingType === "monthly"
                ? { backgroundColor: "var(--color-primary)", color: "#ffffff" }
                : { color: "var(--text-secondary)" }
            }
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingType("yearly")}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
            style={
              billingType === "yearly"
                ? { backgroundColor: "var(--color-primary)", color: "#ffffff" }
                : { color: "var(--text-secondary)" }
            }
          >
            Anual
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-black"
              style={{
                backgroundColor:
                  billingType === "yearly"
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(200,16,46,0.15)",
                color:
                  billingType === "yearly" ? "#ffffff" : "var(--color-primary)",
              }}
            >
              -{Math.round((yearlySaving / (monthlyPrice * 12)) * 100)}%
            </span>
          </button>
        </div>

        {/* Card do plano */}
        <div
          className="rounded-2xl p-6"
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--color-primary-20)",
          }}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <span
                className="text-xs font-bold px-2 py-1 rounded-full"
                style={{
                  backgroundColor: "var(--color-primary-10)",
                  color: "var(--color-primary)",
                  border: "1px solid var(--color-primary-20)",
                }}
              >
                LIVO PRO
              </span>
              {billingType === "monthly" ? (
                <p
                  className="font-black mt-3"
                  style={{
                    fontSize: "36px",
                    letterSpacing: "-1px",
                    color: "var(--text-primary)",
                  }}
                >
                  R$ 197
                  <span
                    className="text-base font-normal"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    /mês
                  </span>
                </p>
              ) : (
                <div className="mt-3">
                  <p
                    className="font-black"
                    style={{
                      fontSize: "36px",
                      letterSpacing: "-1px",
                      color: "var(--text-primary)",
                    }}
                  >
                    R$ 1.997
                    <span
                      className="text-base font-normal"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      /ano
                    </span>
                  </p>
                  <p className="text-sm" style={{ color: "var(--color-gold)" }}>
                    R$ {yearlyMonthly}/mês · Economia de R$ {yearlySaving}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {[
              "Agendamento online ilimitado",
              "Dashboard e relatórios completos",
              "CRM de clientes automático",
              "Comandas e controle de estoque",
              "Comissões por barbeiro",
              "Lívia IA — assistente inteligente",
              "Profissionais ilimitados",
              "Suporte via WhatsApp",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2">
                <span
                  style={{ color: "var(--status-green)", fontSize: "12px" }}
                >
                  ✓
                </span>
                <span
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário */}
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="billingType" value={billingType} />

          <div>
            <label
              className="block text-xs font-semibold mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              CPF do responsável *
            </label>
            <input
              name="cpfCnpj"
              type="text"
              inputMode="numeric"
              value={cpf}
              onChange={(e) => setCpf(maskCPF(e.target.value))}
              placeholder="000.000.000-00"
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{
                backgroundColor: "var(--bg-card-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-primary)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            />
            <p
              className="text-xs mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              Necessário para emissão da cobrança
            </p>
          </div>

          {state?.error && (
            <div
              className="text-xs px-4 py-3 rounded-xl"
              style={{
                color: "var(--status-red)",
                backgroundColor: "rgba(200,16,46,0.08)",
                border: "1px solid rgba(200,16,46,0.2)",
              }}
            >
              {state.error}
            </div>
          )}

          <SubmitButton billingType={billingType} />

          <p
            className="text-center text-xs"
            style={{ color: "var(--text-tertiary)" }}
          >
            Cancele quando quiser · Sem fidelidade · PIX ou cartão
          </p>
        </form>
      </div>
    </main>
  );
}
