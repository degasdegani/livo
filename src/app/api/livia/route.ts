// src/app/api/livia/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

// Rate limiter em memória — 20 req/min por userId (1:1 com barbershopId no modelo atual).
// Em multi-instância serverless cada instância mantém seu próprio Map — suficiente para
// a escala atual. Migrar para Redis/Upstash quando necessário.
type RateLimitEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  try {
    // 1. Verificar autenticação
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // 2. Rate limiting — antes de qualquer query ao banco ou chamada à IA
    const userId = session.user.id;
    const now = Date.now();
    const entry = rateLimitMap.get(userId);

    if (entry && now < entry.resetAt) {
      if (entry.count >= RATE_LIMIT_MAX) {
        return NextResponse.json(
          { error: "Limite de mensagens atingido. Tente novamente em breve." },
          { status: 429 },
        );
      }
      entry.count += 1;
    } else {
      rateLimitMap.set(userId, {
        count: 1,
        resetAt: now + RATE_LIMIT_WINDOW_MS,
      });
    }

    // 4. Pegar mensagens do body
    const { messages, barbershopId } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Mensagens inválidas" },
        { status: 400 },
      );
    }

    // 5. Buscar contexto da barbearia para a Lívia
    const barbershop = barbershopId
      ? await db.barbershop.findUnique({
          where: { id: barbershopId },
          include: {
            services: {
              where: { isActive: true },
              select: { name: true, priceInCents: true, durationMin: true },
            },
            professionals: {
              where: { isActive: true },
              select: { name: true },
            },
            _count: { select: { clients: true } },
          },
        })
      : null;

    // 6. Buscar dados financeiros do mês atual
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [faturamentoMes, totalAgendamentos] = barbershopId
      ? await Promise.all([
          db.comanda.aggregate({
            where: {
              barbershopId,
              status: "closed",
              closedAt: { gte: monthStart },
            },
            _sum: { totalInCents: true },
          }),
          db.appointment.count({
            where: {
              barbershopId,
              date: { gte: monthStart },
              status: { notIn: ["cancelled", "no_show"] },
            },
          }),
        ])
      : [{ _sum: { totalInCents: null } }, 0];

    const faturamento = (faturamentoMes._sum.totalInCents ?? 0) / 100;

    // 7. Montar o system prompt com contexto real da barbearia
    const systemPrompt = `Você é a Lívia, assistente de inteligência artificial do sistema LIVO — a plataforma de gestão para barbearias modernas.

Sua personalidade:
- Direta, simpática e profissional
- Fala português brasileiro natural, sem ser formal demais
- Usa emojis com moderação (máximo 1 por mensagem)
- Respostas concisas — máximo 3 parágrafos curtos
- Quando não souber algo com certeza, diz claramente

Seu papel:
- Ajudar os donos e barbeiros a gerir melhor o negócio
- Responder perguntas sobre faturamento, agenda, clientes e serviços
- Dar dicas práticas de gestão de barbearia
- Explicar como usar o sistema LIVO
- Sugerir melhorias baseadas nos dados do negócio

${
  barbershop
    ? `
Dados da barbearia (use para contextualizar suas respostas):
- Nome: ${barbershop.name}
- Cidade: ${barbershop.city}, ${barbershop.state}
- Total de clientes cadastrados: ${barbershop._count.clients}
- Profissionais ativos: ${barbershop.professionals.map((p) => p.name).join(", ") || "Nenhum"}
- Serviços: ${barbershop.services.map((s) => `${s.name} (R$${(s.priceInCents / 100).toFixed(0)}, ${s.durationMin}min)`).join(" | ") || "Nenhum"}
- Faturamento este mês: R$${faturamento.toFixed(2)}
- Agendamentos este mês: ${totalAgendamentos}
`
    : ""
}

Sobre o sistema LIVO:
- Agenda por barbeiro com slots de 30 minutos
- PDV completo com comandas
- Gestão de clientes com CRM
- Controle de estoque e produtos
- Relatórios de faturamento
- Sistema de comissões por barbeiro
- Marketing: clientes sumidos e aniversariantes
- Página pública de agendamento online

Nunca invente dados financeiros. Se não tiver os dados reais, diga que não tem acesso a essa informação específica no momento.`;

    // 8. Chamar a API da Anthropic
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Anthropic API error:", error);
      return NextResponse.json(
        { error: "Erro ao chamar a IA. Tente novamente." },
        { status: 500 },
      );
    }

    const data = await response.json();
    const text =
      data.content?.[0]?.text ?? "Desculpe, não consegui gerar uma resposta.";

    return NextResponse.json({ message: text });
  } catch (error) {
    console.error("Lívia route error:", error);
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 },
    );
  }
}
