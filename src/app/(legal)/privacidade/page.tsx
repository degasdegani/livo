export default function PrivacidadePage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1
        className="font-black text-white mb-2"
        style={{ fontSize: "32px", letterSpacing: "-1px" }}
      >
        Política de Privacidade
      </h1>
      <p className="text-sm mb-8" style={{ color: "#52525B" }}>
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>

      {[
        {
          titulo: "1. Dados que Coletamos",
          texto: `Coletamos os dados necessários para prestação do serviço: dados de cadastro (nome, e-mail, telefone), dados da barbearia (nome, endereço, serviços, horários), dados dos clientes finais (nome, telefone, e-mail — fornecidos pelos barbeiros), dados de agendamento e dados de pagamento (processados pela Asaas, não armazenamos dados de cartão).`,
        },
        {
          titulo: "2. Como Usamos os Dados",
          texto: `Utilizamos seus dados para: operar e melhorar a plataforma, processar pagamentos, enviar e-mails transacionais (confirmações de agendamento), fornecer suporte técnico e cumprir obrigações legais. Não vendemos seus dados a terceiros.`,
        },
        {
          titulo: "3. Compartilhamento de Dados",
          texto: `Compartilhamos dados apenas com: Asaas (processamento de pagamentos), Resend (envio de e-mails transacionais), Neon (banco de dados em nuvem) e Vercel (hospedagem). Todos os parceiros seguem políticas de privacidade compatíveis com a LGPD.`,
        },
        {
          titulo: "4. Armazenamento e Segurança",
          texto: `Seus dados são armazenados em servidores seguros com criptografia em trânsito (HTTPS/TLS) e em repouso. Utilizamos autenticação segura com tokens JWT. Realizamos backups regulares. Em caso de violação de dados, você será notificado em até 72 horas.`,
        },
        {
          titulo: "5. Seus Direitos (LGPD)",
          texto: `Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a: acessar seus dados, corrigir dados incorretos, solicitar exclusão dos seus dados, portabilidade dos dados, revogar consentimento e ser informado sobre o uso dos seus dados. Para exercer esses direitos, entre em contato: privacidade@livo.com.br`,
        },
        {
          titulo: "6. Cookies",
          texto: `Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento de terceiros ou publicidade. Você pode configurar seu navegador para recusar cookies, mas isso pode afetar o funcionamento do sistema.`,
        },
        {
          titulo: "7. Dados dos Clientes Finais",
          texto: `Os dados dos clientes das barbearias (nome, telefone, e-mail) são coletados e controlados pelos próprios barbeiros. O Livo atua como operador desses dados. Os barbeiros são responsáveis por obter o consentimento adequado de seus clientes para o tratamento dos dados.`,
        },
        {
          titulo: "8. Retenção de Dados",
          texto: `Mantemos seus dados enquanto sua conta estiver ativa. Após cancelamento, dados são mantidos por 90 dias para fins de backup e podem ser excluídos mediante solicitação. Dados fiscais são mantidos por 5 anos conforme exigência legal.`,
        },
        {
          titulo: "9. Alterações nesta Política",
          texto: `Esta política pode ser atualizada periodicamente. Alterações significativas serão comunicadas por e-mail. A versão mais recente sempre estará disponível em livo.com.br/privacidade.`,
        },
        {
          titulo: "10. Contato",
          texto: `Encarregado de Proteção de Dados (DPO): Eduardo Degani. E-mail: privacidade@livo.com.br`,
        },
      ].map((section) => (
        <section key={section.titulo} className="mb-8">
          <h2
            className="font-bold text-white mb-3"
            style={{ fontSize: "18px" }}
          >
            {section.titulo}
          </h2>
          <p style={{ color: "#A1A1AA", lineHeight: 1.8 }}>{section.texto}</p>
        </section>
      ))}
    </article>
  );
}
