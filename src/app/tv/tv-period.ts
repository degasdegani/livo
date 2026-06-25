export type TvPeriod = "DAY" | "WEEK" | "MONTH";

/**
 * Retorna [startUtc, endUtc] da janela do período em fuso America/Sao_Paulo.
 * Usa Date.UTC() internamente — padrão do projeto.
 */
export function getPeriodWindow(period: TvPeriod): { start: Date; end: Date } {
  // Hora atual em SP (UTC-3, sem DST desde 2019)
  const now = new Date();
  const SP_OFFSET_MS = -3 * 60 * 60 * 1000;
  const nowSP = new Date(now.getTime() + SP_OFFSET_MS);

  const y = nowSP.getUTCFullYear();
  const m = nowSP.getUTCMonth();
  const d = nowSP.getUTCDate();
  const dow = nowSP.getUTCDay(); // 0=Dom

  let startSP: Date;
  let endSP: Date;

  if (period === "DAY") {
    startSP = new Date(Date.UTC(y, m, d, 0, 0, 0));
    endSP = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
  } else if (period === "WEEK") {
    // Semana começa na segunda-feira
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    startSP = new Date(Date.UTC(y, m, d + diffToMon, 0, 0, 0));
    endSP = new Date(Date.UTC(y, m, d + diffToMon + 6, 23, 59, 59, 999));
  } else {
    // MONTH
    startSP = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    endSP = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  }

  // Converter de volta para UTC real (subtrair o offset SP)
  return {
    start: new Date(startSP.getTime() - SP_OFFSET_MS),
    end: new Date(endSP.getTime() - SP_OFFSET_MS),
  };
}
