"use server";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { sendWelcomeEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

export async function registerUser(
  prevState: { error: string } | null,
  formData: FormData,
) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!name || !email || !password || !confirm) {
    return { error: "Preencha todos os campos." };
  }
  if (password !== confirm) {
    return { error: "As senhas não coincidem." };
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter no mínimo 6 caracteres." };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Este e-mail já está cadastrado." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await db.user.create({
    data: { name, email, password: hashedPassword },
  });

  // Envia e-mail de boas-vindas
  await sendWelcomeEmail(email, name);

  // Login automático após cadastro — redireciona para dashboard
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/onboarding",
  });

  return null;
}
