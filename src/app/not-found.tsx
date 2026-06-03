// src/app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0B0D] flex flex-col items-center justify-center px-6">
      {/* Logo text */}
      <div className="mb-8 text-center">
        <span className="text-4xl font-black tracking-wider">
          <span className="text-white">LI</span>
          <span className="text-[#C8102E]">V</span>
          <span className="text-[#C8102E]">O</span>
        </span>
      </div>

      {/* 404 */}
      <div className="text-center mb-8">
        <p className="text-8xl font-black text-[#2A2A33] mb-4">404</p>
        <h1 className="text-2xl font-bold text-white mb-2">
          Página não encontrada
        </h1>
        <p className="text-[#9A9AA6] max-w-sm">
          Essa URL não existe ou foi removida. Verifique o endereço ou volte ao
          início.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-[#C8102E] hover:bg-[#E0263D] text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Ir para o Dashboard
        </Link>
        <Link
          href="/"
          className="px-5 py-2.5 border border-[#2A2A33] hover:border-[#C8102E] text-[#9A9AA6] hover:text-white text-sm font-semibold rounded-lg transition-colors"
        >
          Página inicial
        </Link>
      </div>
    </div>
  );
}
