import { auth } from "@/auth";
import { db } from "@/lib/db";
import { InvitationStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import AcceptInviteForm from "./accept-form";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function ConvitePage({ params }: Props) {
  const { token } = await params; // ← await obrigatório no Next.js 16

  // 1. Busca o convite
  const invitation = await db.invitation.findUnique({
    where: { token },
    include: {
      barbershop: { select: { id: true, name: true, slug: true } },
    },
  });

  // 2. Convite não existe
  if (!invitation) {
    return <InvalidInvite reason="not_found" />;
  }

  // 3. Convite já usado
  if (invitation.status === InvitationStatus.accepted) {
    return <InvalidInvite reason="already_used" />;
  }

  // 4. Convite revogado
  if (
    invitation.status === InvitationStatus.revoked ||
    invitation.status === InvitationStatus.expired
  ) {
    return <InvalidInvite reason="revoked" />;
  }

  // 5. Convite expirado (verifica data)
  if (new Date(invitation.expiresAt) < new Date()) {
    await db.invitation.update({
      where: { id: invitation.id },
      data: { status: InvitationStatus.expired },
    });
    return <InvalidInvite reason="expired" />;
  }

  // 6. Verifica sessão atual
  const session = await auth();
  const loggedUser = session?.user ?? null;

  // 7. Se o usuário logado já tem membership nesta barbearia → já está dentro
  if (loggedUser?.id) {
    const existingMembership = await db.membership.findFirst({
      where: {
        userId: loggedUser.id as string,
        barbershopId: invitation.barbershopId,
        isActive: true,
      },
    });
    if (existingMembership) {
      redirect("/dashboard");
    }
  }

  const ROLE_LABELS: Record<string, string> = {
    reception: "Recepção",
    barber: "Barbeiro Colaborador",
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-black tracking-widest">
            <span style={{ color: "#fff" }}>LI</span>
            <span style={{ color: "#C8102E" }}>V</span>
            <span style={{ color: "#C8102E" }}>O</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#17171C] border border-[#2A2A33] rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#C8102E]/10 border-b border-[#2A2A33] px-6 py-5">
            <p className="text-xs text-[#9A9AA6] uppercase tracking-widest mb-1">
              Convite para
            </p>
            <h1 className="text-xl font-bold text-white">
              {invitation.barbershop.name}
            </h1>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 text-sm text-[#C8A24C]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8A24C] inline-block" />
                {ROLE_LABELS[invitation.role] ?? invitation.role}
              </span>
            </div>
          </div>

          {/* Form */}
          <div className="px-6 py-6">
            <AcceptInviteForm
              invitationId={invitation.id}
              invitationEmail={invitation.email}
              loggedUser={
                loggedUser
                  ? {
                      id: loggedUser.id as string,
                      email: loggedUser.email as string,
                      name: loggedUser.name as string,
                    }
                  : null
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tela de erro ──────────────────────────────────────────────────────────────

const INVALID_MESSAGES: Record<string, { title: string; description: string }> =
  {
    not_found: {
      title: "Convite não encontrado",
      description:
        "Este link de convite não existe. Verifique se copiou corretamente.",
    },
    already_used: {
      title: "Convite já aceito",
      description:
        "Este convite já foi utilizado. Acesse o LIVO normalmente pelo login.",
    },
    revoked: {
      title: "Convite revogado",
      description: "Este convite foi cancelado pelo dono da barbearia.",
    },
    expired: {
      title: "Convite expirado",
      description:
        "Este link expirou (validade de 7 dias). Peça ao dono da barbearia que envie um novo convite.",
    },
  };

function InvalidInvite({ reason }: { reason: string }) {
  const info = INVALID_MESSAGES[reason] ?? INVALID_MESSAGES["not_found"];
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="text-5xl mb-6">✉️</div>
        <h1 className="text-xl font-bold text-white mb-2">{info.title}</h1>
        <p className="text-[#9A9AA6] text-sm mb-8">{info.description}</p>
        <a
          href="/login"
          className="inline-block bg-[#C8102E] text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-[#E0263D] transition-colors"
        >
          Ir para o login
        </a>
      </div>
    </div>
  );
}
