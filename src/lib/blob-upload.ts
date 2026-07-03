// src/lib/blob-upload.ts
// Upload de imagem genérico para o Vercel Blob (server-side), reutilizável por
// qualquer upload do projeto. Encapsula: validação de tipo, validação de
// tamanho, chamada a put(..., { access: "public" }) e tratamento de erro.
// Parametrizado (pathPrefix / maxBytes / allowedTypes) em vez de constantes
// fixas — mesmo comportamento do upload de avatar, só generalizado.
//
// Observação: a remoção da imagem ANTERIOR (del) é responsabilidade do caller,
// pois só ele conhece a URL antiga — não faz parte deste helper genérico.

import { put } from "@vercel/blob";

export type UploadImageResult = { url: string } | { error: string };

export async function uploadImageToBlob(params: {
  file: File;
  /** Caminho do blob SEM extensão — ex.: "professionals/{barbershopId}/{id}". */
  pathPrefix: string;
  maxBytes: number;
  allowedTypes: Set<string>;
}): Promise<UploadImageResult> {
  const { file, pathPrefix, maxBytes, allowedTypes } = params;

  if (!allowedTypes.has(file.type)) {
    return { error: "Formato inválido. Use JPEG, PNG ou WebP." };
  }
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return { error: `Arquivo muito grande. Máximo ${maxMb} MB.` };
  }

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";

  try {
    const blob = await put(`${pathPrefix}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
    });
    return { url: blob.url };
  } catch {
    return { error: "Falha ao enviar a imagem. Tente novamente." };
  }
}
