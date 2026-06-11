"use client";

import { useState } from "react";
import { createLead } from "./actions";

// Coloque aqui o link do grupo de WhatsApp (ou deixe "" para esconder o botão)
const GRUPO_WHATSAPP = "";

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.replace(/(\d{0,2})/, "($1");
  if (d.length <= 6) return d.replace(/(\d{2})(\d{0,5})/, "($1) $2");
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3");
}


export function VipForm() {
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [shop, setShop] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);
    const res = await createLead({
      name,
      whatsapp,
      email,
      barbershopName: shop,
    });
    setLoading(false);
    if (res.error) return setError(res.error);
    setDone(true);
  }

  if (done) {
    return (
      <div style={{ textAlign: "center", padding: "10px 0" }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(63,185,80,0.15)",
            border: "2px solid #3FB950",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
            fontSize: 32,
            color: "#3FB950",
          }}
        >
          ✓
        </div>
        <h2
          style={{
            color: "#fff",
            fontSize: 22,
            fontWeight: 800,
            margin: "0 0 10px",
          }}
        >
          Você está na lista! 🎉
        </h2>
        <p
          style={{
            color: "#9A9AA6",
            fontSize: 14,
            lineHeight: 1.5,
            margin: "0 0 22px",
          }}
        >
          Você é um dos <strong style={{ color: "#C8A24C" }}>fundadores</strong>{" "}
          do Livo PRO. Vamos te chamar no WhatsApp assim que liberarmos seu
          acesso — com uma condição especial de pré-lançamento.
        </p>
        {GRUPO_WHATSAPP && (
          <a
            href={GRUPO_WHATSAPP}
            style={{
              display: "block",
              background: "#0B5A45",
              color: "#fff",
              padding: "14px",
              borderRadius: 11,
              fontWeight: 700,
              textDecoration: "none",
              fontSize: 15,
            }}
          >
            Entrar no grupo de avisos
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: "#9A9AA6", fontSize: 12.5, fontWeight: 600, margin: "0 0 6px 2px" }}>Nome completo</label>
        <input
          style={{ width: "100%", background: "#1F1F27", border: "1px solid #2A2A33", borderRadius: 10, padding: "13px 14px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="João da Silva"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: "#9A9AA6", fontSize: 12.5, fontWeight: 600, margin: "0 0 6px 2px" }}>WhatsApp</label>
        <input
          style={{ width: "100%", background: "#1F1F27", border: "1px solid #2A2A33", borderRadius: 10, padding: "13px 14px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}
          value={whatsapp}
          inputMode="numeric"
          onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
          placeholder="(16) 99999-9999"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: "#9A9AA6", fontSize: 12.5, fontWeight: 600, margin: "0 0 6px 2px" }}>E-mail</label>
        <input
          style={{ width: "100%", background: "#1F1F27", border: "1px solid #2A2A33", borderRadius: 10, padding: "13px 14px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}
          value={email}
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", color: "#9A9AA6", fontSize: 12.5, fontWeight: 600, margin: "0 0 6px 2px" }}>Nome da barbearia (opcional)</label>
        <input
          style={{ width: "100%", background: "#1F1F27", border: "1px solid #2A2A33", borderRadius: 10, padding: "13px 14px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box" }}
          value={shop}
          onChange={(e) => setShop(e.target.value)}
          placeholder="Barbearia do João"
        />
      </div>

      {error && (
        <p
          style={{
            color: "#E0263D",
            fontSize: 13,
            margin: "0 0 12px",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: "100%",
          background: loading ? "#7a1020" : "#C8102E",
          color: "#fff",
          border: "none",
          borderRadius: 11,
          padding: "15px",
          fontSize: 15.5,
          fontWeight: 800,
          letterSpacing: 0.5,
          cursor: "pointer",
        }}
      >
        {loading ? "ENVIANDO..." : "GARANTIR MEU ACESSO"}
      </button>
      <p
        style={{
          textAlign: "center",
          color: "#9A9AA6",
          fontSize: 11.5,
          margin: "14px 0 0",
        }}
      >
        Sem custo agora • vagas limitadas
      </p>
    </div>
  );
}
