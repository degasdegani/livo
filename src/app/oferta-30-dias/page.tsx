import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "30 Dias Grátis | LIVO Barber",
  description:
    "Você recebeu acesso exclusivo para testar o LIVO Barber gratuitamente por 30 dias.",
  openGraph: {
    title: "30 Dias Grátis | LIVO Barber",
    description:
      "Você recebeu acesso exclusivo para testar o LIVO Barber gratuitamente por 30 dias.",
    type: "website",
  },
};

export default function Oferta30DiasPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        color: "#fff",
        fontFamily: "Satoshi, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/oferta-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.60) 40%, rgba(0,0,0,.92) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: "720px",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "8px 16px",
            borderRadius: 9999,
            background: "rgba(200,162,76,.15)",
            border: "1px solid rgba(200,162,76,.35)",
            color: "#C8A24C",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          Oferta Exclusiva TX
        </div>

        <div
          style={{
            fontSize: 18,
            fontWeight: 900,
            letterSpacing: ".25em",
            marginBottom: 24,
          }}
        >
          LIVO
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(48px, 9vw, 88px)",
            lineHeight: 1,
            fontWeight: 900,
            letterSpacing: "-0.05em",
          }}
        >
          30 dias grátis
        </h1>

        <p
          style={{
            fontSize: "clamp(20px, 4vw, 28px)",
            color: "#C8A24C",
            marginTop: 12,
            marginBottom: 28,
            fontWeight: 700,
          }}
        >
          para sua barbearia
        </p>

        <p
          style={{
            maxWidth: 560,
            margin: "0 auto 40px",
            fontSize: 18,
            lineHeight: 1.8,
            color: "#E5E7EB",
          }}
        >
          Você recebeu acesso exclusivo para testar o sistema completo do LIVO
          Barber sem custo durante 30 dias.
        </p>

        <a
          href="https://livobarber.com.br/login"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "20px 34px",
            borderRadius: 9999,
            background: "#C8102E",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: 16,
            boxShadow: "0 20px 60px rgba(200,16,46,.35)",
          }}
        >
          Acessar meu benefício →
        </a>
      </div>
    </main>
  );
}
