"use server";

import { signIn } from "@/auth";
import { db } from "@/lib/db";
import { createEmailVerificationToken } from "@/lib/email-verification";
import { sendEmailVerification, sendWelcomeEmail } from "@/lib/email";
import { recordTermsAcceptance } from "@/lib/terms-record";
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
  if (formData.get("acceptTerms") !== "on") {
    return {
      error: "Você precisa aceitar os Termos de Uso e a Política de Privacidade.",
    };
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Este e-mail já está cadastrado." };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: { name, email, password: hashedPassword },
  });

  // Registra o aceite dos termos (pacote único "bundle") na versão vigente.
  // Append-only, com IP/user-agent capturados no server. Antes do auto-login.
  await recordTermsAcceptance(user.id);

  // E-mail de boas-vindas (onboarding) e e-mail de confirmação (posse do e-mail)
  // permanecem separados: responsabilidades distintas, sem acoplar templates.
  await sendWelcomeEmail(email, name);

  const verificationToken = await createEmailVerificationToken(user.id);
  await sendEmailVerification(email, name, verificationToken);

  // Login automático após cadastro (portão suave: login liberado mesmo sem
  // confirmar). O gate real de publicar/cobrar é a etapa B1.3, separada.
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/onboarding",
  });

  return null;
}
