/**
 * Selo Asaas obrigatório por conformidade BaaS (Resolução Conjunta nº 16/2025 BCB).
 * Deve aparecer em todas as telas do Clube que envolvam pagamento.
 *
 * variant:
 *   - "auto"  (padrão): alterna branco/azul via CSS conforme [data-theme] no <html>.
 *     Usar no dashboard, onde o tema dark/light está ativo.
 *   - "dark":  força o selo branco. Usar na rota pública /[slug]/clube, que não
 *     possui [data-theme] no <html> (sempre fundo escuro) — evita o duplo selo.
 *   - "light": força o selo azul.
 */

const SELO_BRANCO =
  "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Branco.svg?id=c83110fd-ecf7-43df-96d7-140d8e71b7df";
const SELO_AZUL =
  "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Positivo.svg?id=c83110fd-ecf7-43df-96d7-140d8e71b7df";

interface Props {
  style?: React.CSSProperties;
  variant?: "auto" | "dark" | "light";
}

export function SeloAsaas({ style, variant = "auto" }: Props) {
  const linkStyle: React.CSSProperties = { display: "inline-block", lineHeight: 0 };
  const imgStyle: React.CSSProperties = { display: "inline-block" };

  const renderImg = (src: string) => (
    <a href="https://asaas.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
      <img src={src} alt="Servicos financeiros Asaas" width={160} height={48} style={imgStyle} />
    </a>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", ...style }}>
      {variant === "dark" && renderImg(SELO_BRANCO)}
      {variant === "light" && renderImg(SELO_AZUL)}
      {variant === "auto" && (
        <a href="https://asaas.com" target="_blank" rel="noopener noreferrer" style={linkStyle}>
          <img src={SELO_BRANCO} alt="Servicos financeiros Asaas" width={160} height={48} style={imgStyle} className="selo-asaas-dark" />
          <img src={SELO_AZUL} alt="Servicos financeiros Asaas" width={160} height={48} style={imgStyle} className="selo-asaas-light" />
        </a>
      )}
      <p style={{ fontSize: "10px", color: "var(--text-tertiary)", textAlign: "center", margin: 0, maxWidth: "200px", lineHeight: "1.4" }}>
        Pagamentos processados pelo Asaas.{" "}
        <a href="https://asaas.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--text-tertiary)", textDecoration: "underline" }}>
          Suporte: 0800 009 0037
        </a>
      </p>
    </div>
  );
}
