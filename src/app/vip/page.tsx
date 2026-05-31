import type { Metadata } from "next";
import { VipForm } from "./vip-form";

export const metadata: Metadata = {
  title: "Livo — Acesso Antecipado",
  description: "Lista exclusiva de pré-lançamento do Livo PRO.",
};

export default function VipPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
        background:
          "radial-gradient(circle at 85% 0%, rgba(200,16,46,0.18), transparent 45%)," +
          "radial-gradient(circle at 0% 100%, rgba(200,162,76,0.12), transparent 45%), #0B0B0D",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#141418",
          border: "1px solid #2A2A33",
          borderRadius: 22,
          padding: "32px 26px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <img
          src="/logo.png"
          alt="Livo"
          style={{ display: "block", width: 200, margin: "0 auto 6px" }}
        />
        <div
          style={{
            border: "1px solid #C8A24C",
            color: "#C8A24C",
            borderRadius: 20,
            padding: "6px 0",
            textAlign: "center",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            maxWidth: 260,
            margin: "8px auto 18px",
          }}
        >
          ACESSO ANTECIPADO • EXCLUSIVO
        </div>
        <h1
          style={{
            textAlign: "center",
            color: "#fff",
            fontSize: 25,
            fontWeight: 800,
            lineHeight: 1.2,
            margin: "0 0 8px",
          }}
        >
          Seja um dos primeiros
          <br />
          <span style={{ color: "#E0263D" }}>a usar o Livo PRO.</span>
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#9A9AA6",
            fontSize: 13.5,
            lineHeight: 1.45,
            margin: "0 0 24px",
          }}
        >
          Lista fechada para quem esteve no workshop. Garanta seu lugar.
        </p>
        <VipForm />
      </div>
    </main>
  );
}
