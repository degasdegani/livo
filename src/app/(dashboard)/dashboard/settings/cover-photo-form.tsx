// src/app/(dashboard)/dashboard/settings/cover-photo-form.tsx
"use client";

import { ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { compressImageFile } from "@/lib/image-compress";
import {
  type CoverUploadResult,
  removeBarbershopCover,
  uploadBarbershopCover,
} from "./actions";

interface Props {
  coverPhotoUrl: string | null;
}

export function CoverPhotoForm({ coverPhotoUrl }: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(coverPhotoUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState("");
  const [hovered, setHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displaySrc = localPreview ?? currentUrl;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const objectUrl = URL.createObjectURL(file);
    setLocalPreview(objectUrl);
    setError("");
    setUploadingCover(true);

    // Comprime/redimensiona no cliente (capa é hero largo → maxSide 1600).
    const uploadFile = await compressImageFile(file, 1600);

    const fd = new FormData();
    fd.append("cover", uploadFile);

    try {
      const result: CoverUploadResult = await uploadBarbershopCover(fd);
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      setUploadingCover(false);
      if (result.success) {
        setCurrentUrl(result.coverPhotoUrl);
      } else {
        setError(result.error);
      }
    } catch {
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      setUploadingCover(false);
      setError("Erro ao enviar a imagem. Tente novamente.");
    }
  }

  async function handleRemove() {
    setUploadingCover(true);
    setError("");

    const result = await removeBarbershopCover();
    setUploadingCover(false);

    if (result.success) {
      setCurrentUrl(null);
    } else {
      setError(result.error);
    }
  }

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)" }}
    >
      <div
        className="px-6 py-4"
        style={{
          backgroundColor: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
          Foto de capa
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          Aparece no topo da página pública da barbearia
        </p>
      </div>

      <div
        className="p-6 flex flex-col gap-3"
        style={{ backgroundColor: "var(--bg-card-elevated)" }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingCover}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative w-full overflow-hidden rounded-xl disabled:cursor-not-allowed"
          style={{
            aspectRatio: "21 / 9",
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
          title="Clique para alterar a capa"
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt="Foto de capa da barbearia"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-2"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ImageIcon size={28} />
              <span className="text-xs font-semibold">
                Adicionar foto de capa
              </span>
            </div>
          )}

          <div
            className="absolute inset-0 flex items-center justify-center transition-opacity"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: hovered || uploadingCover ? 1 : 0,
            }}
          >
            {uploadingCover ? (
              <div
                className="animate-spin rounded-full"
                style={{
                  width: 26,
                  height: 26,
                  border: "2px solid rgba(255,255,255,0.2)",
                  borderTopColor: "#fff",
                }}
              />
            ) : (
              <div className="flex items-center gap-2 text-white">
                <ImageIcon size={18} />
                <span className="text-xs font-semibold">
                  {currentUrl ? "Trocar capa" : "Enviar capa"}
                </span>
              </div>
            )}
          </div>
        </button>

        <div className="flex items-center justify-between">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            JPG, PNG ou WebP · max 10 MB
          </p>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploadingCover}
              className="text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--status-red)" }}
            >
              Remover capa
            </button>
          )}
        </div>

        {error && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{
              color: "var(--color-primary)",
              backgroundColor: "var(--color-primary-10)",
            }}
          >
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
