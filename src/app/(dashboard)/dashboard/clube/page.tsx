import { requireMembershipWithBilling } from "@/lib/permissions";
import { getClubData } from "./actions";
import { ClubeDashboard } from "./clube-client";

export default async function ClubePage() {
  await requireMembershipWithBilling();

  const data = await getClubData();
  return <ClubeDashboard data={data} />;
}
