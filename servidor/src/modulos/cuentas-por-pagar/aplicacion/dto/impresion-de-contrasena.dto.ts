import type { EstadoDeContrasena } from '../../dominio/contrasena.js';
import type { TipoDeDocumento } from '../../dominio/tipos-de-documento.js';
import type { EmpresaDeLaImpresion } from '../puertos/puertos-de-impresion-de-contrasenas.js';
import type { AnulacionDeContrasenaDto, TotalesDeContrasenaDto } from './contrasena.dto.js';

/** Una de las dos hojas de la impresión: el original del proveedor y la copia de la empresa. */
export interface HojaDeImpresionDto {
  rotulo: string;
  /** La copia la firma el proveedor y se queda en la empresa. */
  firmaElProveedor: boolean;
}

/** Un cargo en el papel: lo fijo (total y retenciones) y lo vivo (rebajado y saldo, «al» día de la impresión). */
export interface CargoImpresoDto {
  documentoId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  retenciones: string;
  rebajado: string;
  /** Lo pagado más lo comprometido (cheques posfechados, que llevan su marca aparte), «al» día de la impresión. */
  pagado: string;
  saldo: string;
}

/** Lo que una nota de crédito compensó dentro de la contraseña. */
export interface CompensacionImpresaDto {
  documentoId: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  monto: string;
  /** «Compensación con nota N (saldo a favor)». */
  texto: string;
}

/** Un pago vigente con fecha posterior a la impresión: se suma en «Pagado» con su marca. */
export interface ChequePosfechadoImpresoDto {
  pagoId: string;
  monto: string;
  /** «Pago N: cheque al dd/mm/aaaa». */
  texto: string;
}

/** Retención de un saldo inicial que la empresa todavía no practicó: se informa, no se resta. */
export interface RetencionPorEmitirImpresaDto {
  documentoId: string;
  monto: string;
  /** «Retención por emitir: Q…; se entregará su constancia». */
  texto: string;
}

/** Todo lo que lleva la contraseña impresa; la pantalla solo lo dibuja. */
export interface ImpresionDeContrasenaDto {
  empresa: EmpresaDeLaImpresion;
  contrasena: {
    id: string;
    numero: string;
    fecha: string;
    fechaDePago: string;
    observaciones: string | null;
    estado: EstadoDeContrasena;
  };
  proveedor: { nombre: string; nit: string | null };
  hojas: HojaDeImpresionDto[];
  cargos: CargoImpresoDto[];
  totales: TotalesDeContrasenaDto;
  compensaciones: CompensacionImpresaDto[];
  retencionesPorEmitir: RetencionPorEmitirImpresaDto[];
  chequesPosfechados: ChequePosfechadoImpresoDto[];
  hayRetenciones: boolean;
  /** «Las retenciones se documentan con su constancia.»; nulo si ningún cargo tiene retenciones. */
  leyendaDeRetenciones: string | null;
  /** La leyenda de la empresa; nula si está vacía. */
  leyenda: string | null;
  /** Fecha (`AAAA-MM-DD`) de los montos vivos. */
  alDia: string;
  reimpresion: boolean;
  impresoPorNombre: string | null;
  /** Instante ISO de esta impresión. */
  impresoEn: string;
  anulacion: AnulacionDeContrasenaDto | null;
}
