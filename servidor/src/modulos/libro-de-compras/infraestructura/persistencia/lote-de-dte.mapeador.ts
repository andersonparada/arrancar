import type { LoteDeDte } from '../../dominio/lote-de-dte.js';
import type { lotesDeDte } from './lotes-de-dte.tablas.js';

type Fila = typeof lotesDeDte.$inferSelect;

/** Traduce entre la fila de `lotes_de_dte` y el resumen del lote. */
export const mapeadorDeLoteDeDte = {
  aLote({ creadoEn, actualizadoEn, creadoPor, actualizadoPor, ...lote }: Fila): LoteDeDte {
    return lote;
  },

  aFila(lote: LoteDeDte): typeof lotesDeDte.$inferInsert {
    return lote;
  },
};
