// Fonte única de configuração dos slots da Agenda LIVO.
// Todos os componentes e funções que operam com slots devem importar daqui.
// Para alterar a granularidade da agenda, edite apenas este arquivo.

export const SLOT_CONFIG = {
  HOUR_START: 8,
  HOUR_END: 20,
  SLOT_MINUTES: 10,
  SLOT_HEIGHT: 20,
} as const;

// Derivado: número total de slots no dia operacional
export const TOTAL_SLOTS =
  ((SLOT_CONFIG.HOUR_END - SLOT_CONFIG.HOUR_START) * 60) /
  SLOT_CONFIG.SLOT_MINUTES;
