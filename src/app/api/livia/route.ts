// src/app/api/livia/route.ts

import { type NextRequest, NextResponse } from "next/server";
import { getCurrentMembership } from "@/lib/permissions";
import { db } from "@/lib/db";
import { log } from "@/lib/logger";

// Rate limiter em memória — 20 req/min por userId (1:1 com barbershopId no modelo atual).
// Em multi-instância serverless cada instância mantém seu próprio Map — suficiente para
// a escala atual. Migrar para Redis/Upstash quando necessário.
type RateLimitEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

export async function POST(req: NextRequest) {
  const correlationId = req.headers.get("x-correlation-id") ?? undefined;

  try {
    const membership = await getCurrentMembership();
    if (!membership) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const userId = membership.userId;
    const now = Date.now();
    const entry = rateLimitMap.get(userId);

    if (entry && now < entry.resetAt) {
      if (entry.count >= RATE_LIMIT_MAX) {
        log.livia.warn("rate limit atingido", {
          correlationId,
          userId,
          barbershopId: membership.barbershopId,
        });
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

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Mensagens inválidas" },
        { status: 400 },
      );
    }

    const barbershop = await db.barbershop.findUnique({
      where: { id: membership.barbershopId },
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
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [faturamentoMes, totalAgendamentos] = await Promise.all([
      db.comanda.aggregate({
        where: {
          barbershopId: membership.barbershopId,
          status: "closed",
          closedAt: { gte: monthStart },
        },
        _sum: { totalInCents: true },
      }),
      db.appointment.count({
        where: {
          barbershopId: membership.barbershopId,
          date: { gte: monthStart },
          status: { notIn: ["cancelled", "no_show"] },
        },
      }),
    ]);

    const faturamento = (faturamentoMes._sum.totalInCents ?? 0) / 100;

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
      log.livia.error("Anthropic API error", {
        correlationId,
        userId,
        barbershopId: membership.barbershopId,
        status: response.status,
        anthropicError: error,
      });
      return NextResponse.json(
        { error: "Erro ao chamar a IA. Tente novamente." },
        { status: 500 },
      );
    }

    const data = await response.json();
    const text =
      data.content?.[0]?.text ?? "Desculpe, não consegui gerar uma resposta.";

    log.livia.info("resposta gerada", {
      correlationId,
      userId,
      barbershopId: membership.barbershopId,
    });

    return NextResponse.json({ message: text });
  } catch (error) {
    log.livia.error("erro interno na rota Lívia", { correlationId }, error);
    return NextResponse.json(
      { error: "Erro interno. Tente novamente." },
      { status: 500 },
    );
  }
}
