import { getAgendaDay, getServicesForAgenda } from "./agenda-actions";
import AgendaBoard from "./agenda-board";

export const metadata = {
  title: "Agenda | LIVO",
};

type Props = {
  searchParams: Promise<{ date?: string }>;
};

export default async function AgendaPage({ searchParams }: Props) {
  const { date } = await searchParams;

  const todayKey = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  })();

  const dateKey = date ?? todayKey;

  const [dayData, services] = await Promise.all([
    getAgendaDay(dateKey),
    getServicesForAgenda(),
  ]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-6 pb-0 flex-shrink-0">
        <h1 className="text-xl font-bold text-white">Agenda</h1>
        <p className="text-sm text-[#9A9AA6] mt-0.5">
          Visão por profissional — clique em um slot para agendar
        </p>
      </div>

      <div className="flex-1 mt-4 min-h-0">
        <AgendaBoard
          initialData={dayData}
          initialDateKey={dateKey}
          services={services}
        />
      </div>
    </div>
  );
}
