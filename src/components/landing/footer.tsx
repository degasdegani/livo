import { Container } from "@/components/layout/container";

const LINKS = {
  Produto: [
    { label: "Funcionalidades", href: "#funcionalidades" },
    { label: "Planos", href: "#planos" },
    { label: "IA integrada", href: "#ia" },
    { label: "Parceiros", href: "#parceria" },
  ],
  Acesso: [
    { label: "Criar conta", href: "/onboarding" },
    { label: "Entrar", href: "/login" },
    { label: "Lista de espera", href: "/vip" },
  ],
  Legal: [
    { label: "Termos de Uso", href: "/termos" },
    { label: "Privacidade", href: "/privacidade" },
  ],
} as const;

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "#030303",
      }}
    >
      <Container>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 py-16">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#FF2D55",
                  display: "inline-block",
                  boxShadow: "0 0 10px rgba(255,45,85,0.5)",
                }}
              />
              <span
                className="font-black text-white"
                style={{ fontSize: "20px", letterSpacing: "-0.5px" }}
              >
                Livo
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "#52525B", maxWidth: "200px" }}
            >
              Gestão inteligente para barbearias modernas.
            </p>
          </div>

          {Object.entries(LINKS).map(([category, links]) => (
            <div key={category}>
              <p
                className="text-xs font-bold tracking-widest uppercase mb-5"
                style={{ color: "#52525B" }}
              >
                {category}
              </p>
              <ul className="flex flex-col gap-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm hover:text-white transition-colors duration-200"
                      style={{ color: "#3F3F46", textDecoration: "none" }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="flex flex-col md:flex-row items-center justify-between gap-4 py-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <p style={{ fontSize: "12px", color: "#27272A" }}>
            © 2026 Livo. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-2">
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#00D4A0",
                display: "inline-block",
                boxShadow: "0 0 8px rgba(0,212,160,0.5)",
              }}
            />
            <span style={{ fontSize: "12px", color: "#3F3F46" }}>
              Sistema operacional
            </span>
          </div>
          <p
            style={{
              fontSize: "11px",
              color: "#27272A",
              fontFamily: "var(--font-mono)",
            }}
          >
            livobarber.com.br
          </p>
        </div>
      </Container>
    </footer>
  );
}
