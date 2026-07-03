// src/lib/image-compress.ts
// Compressão/redimensionamento de imagem NO CLIENTE (canvas), reutilizável por
// qualquer upload de imagem do projeto (avatar de profissional, foto de capa, …).
// Reduz o maior lado para ~800px e re-encoda como JPEG q0.8. Qualquer falha →
// devolve o arquivo original (fallback seguro, nunca bloqueia o usuário).

export async function compressImageFile(file: File): Promise<File> {
  try {
    if (typeof document === "undefined") return file;
    const bitmap = await createImageBitmap(file);
    const maxSide = 800;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8),
    );
    // Só usa a versão comprimida se realmente ficou menor que a original.
    if (!blob || blob.size >= file.size) return file;

    const newName = `${file.name.replace(/\.[^.]+$/, "")}.jpg`;
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
