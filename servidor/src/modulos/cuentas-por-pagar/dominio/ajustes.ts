/** Por qué se da de baja (todo o parte) el saldo libre de una nota de crédito. */
export const CAUSAS_DE_AJUSTE = ['no_recuperable', 'diferencia_menor', 'compensado_con_otra_cuenta'] as const;

export type CausaDeAjuste = (typeof CAUSAS_DE_AJUSTE)[number];

/**
 * Qué hace Contabilidad con el ajuste: lo lleva a gasto (`perdida`), a una cuenta puente (`transitoria`) o a otros ingresos
 * sin IVA (`ingreso`: la diferencia de centavos de un cargo al pagarlo).
 */
export type EfectoDelAjuste = 'perdida' | 'transitoria' | 'ingreso';

/** La diferencia menor que deja un pago sobre un cargo es un ingreso de la empresa, no una pérdida. */
export const EFECTO_DE_LA_DIFERENCIA_DE_UN_CARGO: EfectoDelAjuste = 'ingreso';

/** El efecto de un ajuste de nota sale de la causa y no se guarda. */
export const EFECTO_DE_LA_CAUSA: Readonly<Record<CausaDeAjuste, EfectoDelAjuste>> = {
  no_recuperable: 'perdida',
  diferencia_menor: 'perdida',
  compensado_con_otra_cuenta: 'transitoria',
};

/** Un ajuste guardado: la baja de parte del saldo libre de una nota. Solo los `vigentes` restan del saldo libre. */
export interface AjusteDeSaldo {
  id: string;
  documentoId: string;
  montoCentavos: number;
  /** `AAAA-MM-DD`. */
  fecha: string;
  causa: CausaDeAjuste;
  motivo: string;
  referencia: string | null;
  estado: 'vigente' | 'anulado';
  /** Por qué se anuló; nulo mientras esté vigente. */
  motivoDeAnulacion: string | null;
}
