import { getClubData } from "./actions";
import { ClubeDashboard } from "./clube-client";

export default async function ClubePage() {
  const data = await getClubData();
  return <ClubeDashboard data={data} />;
}
