// src/app/(dashboard)/dashboard/settings/profile-logo-form.tsx
"use client";

import { ImageIcon } from "lucide-react";
import { useRef, useState } from "react";
import { compressImageFile } from "@/lib/image-compress";
import {
  type LogoUploadResult,
  removeBarbershopLogo,
  uploadBarbershopLogo,
} from "./actions";

interface Props {
  logoUrl: string | null;
}

export function ProfileLogoForm({ logoUrl }: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(logoUrl);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
    setUploadingLogo(true);

    // Comprime/redimensiona no cliente (logo é quadrado/pequeno → maxSide 800).
    const uploadFile = await compressImageFile(file, 800);

    const fd = new FormData();
    fd.append("logo", uploadFile);

    try {
      const result: LogoUploadResult = await uploadBarbershopLogo(fd);
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      setUploadingLogo(false);
      if (result.success) {
        setCurrentUrl(result.logoUrl);
      } else {
        setError(result.error);
      }
    } catch {
      URL.revokeObjectURL(objectUrl);
      setLocalPreview(null);
      setUploadingLogo(false);
      setError("Erro ao enviar a imagem. Tente novamente.");
    }
  }

  async function handleRemove() {
    setUploadingLogo(true);
    setError("");

    const result = await removeBarbershopLogo();
    setUploadingLogo(false);

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
          Foto de perfil / logo
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
          Círculo que aparece sobre a capa na página pública
        </p>
      </div>

      <div
        className="p-6 flex items-center gap-4"
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
          disabled={uploadingLogo}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="relative overflow-hidden rounded-full disabled:cursor-not-allowed"
          style={{
            width: 96,
            height: 96,
            flexShrink: 0,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
          title="Clique para alterar o logo"
        >
          {displaySrc ? (
            <img
              src={displaySrc}
              alt="Logo da barbearia"
              style={{ width: 96, height: 96, objectFit: "cover" }}
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center gap-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ImageIcon size={22} />
            </div>
          )}

          <div
            className="absolute inset-0 flex items-center justify-center rounded-full transition-opacity"
            style={{
              backgroundColor: "rgba(0,0,0,0.5)",
              opacity: hovered || uploadingLogo ? 1 : 0,
            }}
          >
            {uploadingLogo ? (
              <div
                className="animate-spin rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  border: "2px solid rgba(255,255,255,0.2)",
                  borderTopColor: "#fff",
                }}
              />
            ) : (
              <ImageIcon size={18} className="text-white" />
            )}
          </div>
        </button>

        <div className="flex flex-col gap-2">
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            JPG, PNG ou WebP · max 10 MB
          </p>
          {currentUrl && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploadingLogo}
              className="text-xs text-left transition-opacity hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--status-red)" }}
            >
              Remover logo
            </button>
          )}
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
      </div>
    </section>
  );
}
