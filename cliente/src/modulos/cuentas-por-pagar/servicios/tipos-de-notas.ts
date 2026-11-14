import type { EstadoDeDocumento, OrigenDelDocumento, TipoDeDocumento } from './tipos';

/** Tipos de aplicar y ajustar el saldo a favor de las notas de crédito. */
export type FormaDeAplicacion = 'automatica' | 'manual';

export type CausaDeAjuste = 'no_recuperable' | 'diferencia_menor' | 'compensado_con_otra_cuenta';
/** `perdida` va a gasto; `transitoria` pasa a otra cuenta del mismo tercero. */
export type EfectoDelAjuste = 'perdida' | 'transitoria';

/** Un ajuste del saldo libre de una nota de crédito, también los anulados. */
export interface AjusteDelDocumento {
  id: string;
  monto: string;
  fecha: string;
  causa: CausaDeAjuste;
  efecto: EfectoDelAjuste;
  motivo: string;
  referencia: string | null;
  estado: 'vigente' | 'anulado';
  creadoPor: string | null;
  creadoEn: string;
  anulacion: { motivo: string; anuladoPorNombre: string | null; anuladoEn: string | null } | null;
  /** Solo un ajuste vigente se anula (el permiso se revisa aparte). */
  puedeAnular: boolean;
}

export interface AplicacionDelDocumento {
  id: string;
  /** `automatica` se hizo al recibir la nota; `manual` la hizo una persona y se puede quitar. */
  forma: FormaDeAplicacion;
  fecha: string;
  referencia: string | null;
  /** Solo las manuales se quitan (el permiso se revisa aparte). */
  puedeQuitar: boolean;
  notaId: string;
  notaSerie: string | null;
  notaNumero: string;
  cargoId: string;
  cargoSerie: string | null;
  cargoNumero: string;
  monto: string;
}

/** Un cargo del proveedor al que se puede aplicar una nota de crédito, con lo que el servidor propone. */
export interface CargoParaAplicar {
  id: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  /** `null` en un saldo inicial. */
  fechaRecepcion: string | null;
  vencimiento: string | null;
  estado: EstadoDeDocumento;
  total: string;
  saldo: string;
  propuesto: string;
  origen: OrigenDelDocumento;
  /** El total llega al umbral de bancarización: conviene guardar por escrito el acuerdo. */
  sobreUmbralDeBancarizacion: boolean;
}

/** Lo que la ventana de aplicar necesita; los cargos vienen en el orden en que se ofrecen. */
export interface CargosParaAplicar {
  saldoLibre: string;
  fechaMinima: string | null;
  cargos: CargoParaAplicar[];
}

export interface DatosDeAplicacion {
  fecha: string;
  referencia: string | null;
  aplicaciones: { cargoId: string; monto: string }[];
}

export interface DatosDeAjuste {
  monto: string;
  fecha: string;
  causa: CausaDeAjuste;
  motivo: string;
  referencia: string | null;
}
