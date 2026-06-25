"use client";

import { useEffect, useState, useCallback } from "react";
import { TvActivate } from "./tv-activate";
import { TvDisplay } from "./tv-display";
import { TvCelebration } from "./tv-celebration";
import { TV_TOKEN_KEY } from "./tv-constants";

export default function TvPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TV_TOKEN_KEY);
    setToken(stored);
    setReady(true);
  }, []);

  const handleRevoked = useCallback(() => {
    localStorage.removeItem(TV_TOKEN_KEY);
    setToken(null);
  }, []);

  const handleCelebrate = useCallback(() => {
    setCelebrating(true);
  }, []);

  const handleCelebrationDone = useCallback(() => {
    setCelebrating(false);
  }, []);

  // Evita flash de conteúdo antes de checar localStorage
  if (!ready) return null;

  if (!token) {
    return <TvActivate onActivated={(t) => setToken(t)} />;
  }

  return (
    <>
      <TvDisplay
        token={token}
        onRevoked={handleRevoked}
        onCelebrate={handleCelebrate}
      />
      {celebrating && <TvCelebration onDone={handleCelebrationDone} />}
    </>
  );
}
