// ============================================================
// LIVO — Auth.js API Route Handler
// Exporta os handlers GET e POST do Auth.js para o Next.js
// Essa rota processa TODOS os callbacks de autenticação
// ============================================================

import { handlers } from "@/auth";

// Auth.js exporta handlers GET e POST
// GET  → usado para obter sessão, iniciar OAuth
// POST → usado para login com credenciais, logout
export const { GET, POST } = handlers;
