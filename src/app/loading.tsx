// src/app/loading.tsx
export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[#C8102E] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-[#6E6E78]">Carregando…</p>
      </div>
    </div>
  );
}
