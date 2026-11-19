import type { Comprobante } from './tipos-de-comprobantes';

/** Lo que el servidor manda de los arqueos; el dinero viaja como texto con dos decimales. */

export type DestinoDelFaltante = 'perdida' | 'cobrar_al_custodio';

export interface LineaDeConteo {
  denominacion: string;
  cantidad: number;
  subtotal: string;
}

export interface ArqueoResumen {
  id: string;
  fondoId: string;
  numero: number;
  realizadoEn: string;
  custodio: string;
  loHizoElCustodio: boolean;
  efectivoContado: string;
  valoresPorCambiar: string;
  efectivoEsperado: string;
  /** Negativa = faltante. */
  diferencia: string;
  estado: 'vigente' | 'anulado';
  fechaDeAnulacion: string | null;
  motivoDeAnulacion: string | null;
}

export interface Arqueo extends ArqueoResumen {
  arqueadoPor: string;
  conteo: LineaDeConteo[];
  montoDelFondo: string;
  pendienteDeReponer: string;
  valesAbiertos: string;
  comprobantesCompletos: boolean;
  motivoDeDiferencia: string | null;
  observaciones: string | null;
  destinoDelFaltante: DestinoDelFaltante | null;
  comprobante: Comprobante | null;
  avisos: string[];
}

/** Lo que el sistema espera en la caja, para contar contra eso. */
export interface PropuestaDeArqueo {
  fondoId: string;
  fondoNombre: string;
  custodio: string | null;
  monto: string;
  pendienteDeReponer: string;
  valesAbiertos: string;
  efectivoEsperado: string;
  /** Las denominaciones que se cuentan, de mayor a menor («200.00», «0.50»…). */
  denominaciones: string[];
  pendientes: Comprobante[];
  avisos: string[];
}

export interface ArqueoSolicitado {
  realizadoEn?: string;
  conteo: { denominacionCentavos: number; cantidad: number }[];
  valoresPorCambiar?: string;
  comprobantesCompletos: boolean;
  observaciones?: string | null;
  motivoDeDiferencia?: string | null;
  destinoDelFaltante?: DestinoDelFaltante | null;
}
