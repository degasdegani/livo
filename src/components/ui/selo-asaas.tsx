/**
 * Selo Asaas obrigatório por conformidade BaaS (Resolução Conjunta nº 16/2025 BCB).
 * Alterna automaticamente entre versão branca (dark theme) e azul (light theme).
 * Deve aparecer em todas as telas do Clube que envolvam pagamento.
 */

const SELO_BRANCO =
  "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Branco.svg?id=c83110fd-ecf7-43df-96d7-140d8e71b7df";
const SELO_AZUL =
  "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Positivo.svg?id=c83110fd-ecf7-43df-96d7-140d8e71b7df";

interface Props {
  style?: React.CSSProperties;
}

export function SeloAsaas({ style }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", ...style }}>
      <a
        href="https://asaas.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: "inline-block", lineHeight: 0 }}
      >
        {/* Selo branco — visível no dark theme */}
        <img
          src={SELO_BRANCO}
          alt="Servicos financeiros Asaas"
          width={160}
          height={48}
          style={{
            display: "inline-block",
          }}
          className="selo-asaas-dark"
        />
        {/* Selo azul — visível no light theme */}
        <img
          src={SELO_AZUL}
          alt="Servicos financeiros Asaas"
          width={160}
          height={48}
          style={{
            display: "inline-block",
          }}
          className="selo-asaas-light"
        />
      </a>
      <p style={{
        fontSize: "10px",
        color: "var(--text-tertiary)",
        textAlign: "center",
        margin: 0,
        maxWidth: "200px",
        lineHeight: "1.4",
      }}>
        Pagamentos processados pelo Asaas.{" "}
        <a
          href="https://asaas.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--text-tertiary)", textDecoration: "underline" }}
        >
          Suporte: 0800 009 0037
        </a>
      </p>
    </div>
  );
}
