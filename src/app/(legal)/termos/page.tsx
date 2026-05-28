export default function TermosPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1
        className="font-black text-white mb-2"
        style={{ fontSize: "32px", letterSpacing: "-1px" }}
      >
        Termos de Uso
      </h1>
      <p className="text-sm mb-8" style={{ color: "#52525B" }}>
        Última atualização: {new Date().toLocaleDateString("pt-BR")}
      </p>

      {[
        {
          titulo: "1. Aceitação dos Termos",
          texto: `Ao acessar e utilizar a plataforma Livo, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize nossos serviços. O Livo é uma plataforma SaaS de gestão e agendamento para barbearias, desenvolvida e operada por Eduardo Degani.`,
        },
        {
          titulo: "2. Descrição do Serviço",
          texto: `O Livo oferece ferramentas de gestão para barbearias, incluindo: sistema de agendamento online, dashboard de gestão, CRM de clientes, relatórios financeiros e integração com meios de pagamento. O acesso é fornecido mediante assinatura mensal conforme o plano contratado.`,
        },
        {
          titulo: "3. Cadastro e Conta",
          texto: `Para utilizar o Livo, você deve criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Notifique-nos imediatamente em caso de uso não autorizado.`,
        },
        {
          titulo: "4. Planos e Pagamentos",
          texto: `Os planos são cobrados mensalmente via PIX ou cartão de crédito processados pela Asaas Pagamentos S.A. O cancelamento pode ser feito a qualquer momento sem multa. Após o cancelamento, o acesso é mantido até o fim do período pago. Não realizamos reembolsos de períodos já pagos.`,
        },
        {
          titulo: "5. Trial Gratuito",
          texto: `Novos usuários recebem 30 dias de acesso gratuito ao plano Start. Não é necessário cartão de crédito para iniciar o trial. Ao final do período, é necessário assinar um plano para continuar utilizando o serviço.`,
        },
        {
          titulo: "6. Uso Aceitável",
          texto: `Você concorda em utilizar o Livo apenas para fins legítimos relacionados à gestão de sua barbearia. É proibido: usar o serviço para atividades ilegais, tentar acessar contas de outros usuários, realizar engenharia reversa da plataforma ou revender o acesso a terceiros.`,
        },
        {
          titulo: "7. Propriedade Intelectual",
          texto: `Todo o conteúdo, design e código da plataforma Livo são propriedade de Eduardo Degani. Os dados inseridos por você (clientes, agendamentos, serviços) permanecem de sua propriedade. Você nos concede licença para armazenar e processar esses dados para prestação do serviço.`,
        },
        {
          titulo: "8. Disponibilidade do Serviço",
          texto: `Nos esforçamos para manter o Livo disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência. Não nos responsabilizamos por perdas decorrentes de indisponibilidade temporária.`,
        },
        {
          titulo: "9. Limitação de Responsabilidade",
          texto: `O Livo é fornecido "como está". Não nos responsabilizamos por lucros cessantes, perda de dados ou quaisquer danos indiretos decorrentes do uso ou impossibilidade de uso da plataforma. Nossa responsabilidade total é limitada ao valor pago nos últimos 3 meses.`,
        },
        {
          titulo: "10. Alterações nos Termos",
          texto: `Podemos atualizar estes termos a qualquer momento. Alterações significativas serão comunicadas por e-mail com 30 dias de antecedência. O uso continuado após as alterações constitui aceitação dos novos termos.`,
        },
        {
          titulo: "11. Contato",
          texto: `Para dúvidas sobre estes termos, entre em contato: contato@livo.com.br`,
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
