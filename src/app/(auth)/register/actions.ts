// ============================================================
// LIVO — Server Action: Cadastro de usuário
// Roda no servidor — acesso direto ao banco, sem API
// ============================================================

"use server";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

interface RegisterResult {
  success?: boolean;
  error?: string;
}

export async function registerUser(
  formData: FormData,
): Promise<RegisterResult> {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    // Validações básicas
    if (!name || !email || !password || !confirm) {
      return { error: "Preencha todos os campos." };
    }

    if (password !== confirm) {
      return { error: "As senhas não coincidem." };
    }

    if (password.length < 6) {
      return { error: "A senha precisa ter no mínimo 6 caracteres." };
    }

    // Verifica se e-mail já existe
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Este e-mail já está cadastrado." };
    }

    // Criptografa a senha
    // 12 = número de rounds do bcrypt (quanto maior, mais seguro e mais lento)
    // 12 é o padrão recomendado para produção
    const hashedPassword = await bcrypt.hash(password, 12);

    // Cria o usuário no banco
    await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return { success: true };
  } catch {
    return { error: "Erro ao criar conta. Tente novamente." };
  }
}
