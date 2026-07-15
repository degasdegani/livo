import { Gift } from "lucide-react";
import { getReferralData } from "@/lib/referral-server";
import { ReferralSection } from "./referral-section";

export default async function IndicacoesPage() {
  const referral = await getReferralData();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: "var(--bg-card-elevated)",
            border: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Gift size={20} style={{ color: "var(--color-primary)" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Indicações
          </h1>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            Indique outras barbearias e ganhe meses grátis
          </p>
        </div>
      </div>
      <ReferralSection
        referralLink={referral.referralLink}
        referralCode={referral.referralCode}
        isEmbaixador={referral.isEmbaixador}
        freeMonthCredits={referral.freeMonthCredits}
      />
    </div>
  );
}
