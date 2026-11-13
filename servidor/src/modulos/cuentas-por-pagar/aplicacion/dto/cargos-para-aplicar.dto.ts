import type { EstadoDeDocumento, OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Un cargo del proveedor que una nota de crédito puede rebajar, con lo que se propone aplicarle. Dinero como texto. */
export interface CargoParaAplicarDto {
  id: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  /** Nula en un saldo inicial. */
  fechaRecepcion: string | null;
  vencimiento: string | null;
  estado: EstadoDeDocumento;
  total: string;
  /** Lo que todavía se debe del cargo. */
  saldo: string;
  /** Lo que se propone aplicar (cero si ya no queda saldo libre); la persona lo cambia. */
  propuesto: string;
  origen: OrigenDeDocumento;
  /** El total del cargo llega al umbral de bancarización: conviene guardar por escrito el acuerdo. */
  sobreUmbralDeBancarizacion: boolean;
}

/** Lo que la ventana de aplicar necesita: el saldo libre de la nota, desde cuándo puede aplicarse y los cargos. */
export interface CargosParaAplicarDto {
  saldoLibre: string;
  /** `AAAA-MM-DD`; nula si nada limita la fecha de la nota. La ventana la sube según los cargos que se elijan. */
  fechaMinima: string | null;
  /** En el orden en que se ofrecen: primero los autorizados, luego por vencimiento. */
  cargos: CargoParaAplicarDto[];
}
