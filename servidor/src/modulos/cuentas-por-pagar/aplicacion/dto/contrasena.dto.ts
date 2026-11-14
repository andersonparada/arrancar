import type { EstadoDeContrasena } from '../../dominio/contrasena.js';
import type { EstadoDePagoDto, PagoDeLaContrasenaDto } from './pagos.dto.js';
import type { EstadoDeDocumento, OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Un cargo de la contraseña. Dinero como texto con dos decimales; `total` y `retenciones` son fijos, `rebajado` y `saldo` son de hoy. */
export interface CargoDeContrasenaDto {
  /** El id del documento en Cuentas por pagar. */
  documentoId: string;
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  origen: OrigenDeDocumento;
  fechaEmision: string;
  vencimiento: string | null;
  estado: EstadoDeDocumento;
  total: string;
  retenciones: string;
  /** Lo que las notas y los pagos anteriores al inicio rebajaron del neto. */
  rebajado: string;
  /** Lo que falta por pagar de este cargo. */
  saldo: string;
  /** Lo que los pagos vigentes entregaron con fecha de hoy o anterior. */
  pagado: string;
  /** Lo de pagos vigentes con fecha posterior a hoy (cheques posfechados); el saldo ya lo resta. */
  comprometido: string;
  /** Solo un saldo inicial: retenciones que la empresa todavía no practicó (informativo). */
  retencionesPorPracticar: string | null;
  /** El total llega al umbral de bancarización. */
  sobreUmbralDeBancarizacion: boolean;
}

/** Una nota de crédito de la contraseña, con lo que aplicó dentro de ella y lo que le queda libre. */
export interface NotaDeContrasenaDto {
  documentoId: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  aplicadoEnLaContrasena: string;
  saldoLibre: string;
}

export interface TotalesDeContrasenaDto {
  total: string;
  retenciones: string;
  rebajado: string;
  pagado: string;
  comprometido: string;
  saldo: string;
}

export interface AnulacionDeContrasenaDto {
  motivo: string;
  anuladaPorNombre: string | null;
  anuladaEn: string;
}

/** La contraseña con sus montos de hoy. */
export interface ContrasenaDto {
  id: string;
  /** Como se lee en el papel: `15` o `2026-15`. */
  numero: string;
  numeroCorrelativo: number;
  anioDeNumero: number;
  fecha: string;
  fechaDePago: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorNit: string | null;
  observaciones: string | null;
  estado: EstadoDeContrasena;
  cargos: CargoDeContrasenaDto[];
  notas: NotaDeContrasenaDto[];
  totales: TotalesDeContrasenaDto;
  impresa: boolean;
  impresaEn: string | null;
  anulacion: AnulacionDeContrasenaDto | null;
  creadoPorNombre: string | null;
  creadoEn: string;
  /** Una contraseña vigente se edita aunque tenga pagos: la fecha prometida, agregar y quitar documentos sin pagos. */
  puedeEditar: boolean;
  /** Vigente y sin pagos vigentes: con ellos se anulan primero los pagos. */
  puedeAnular: boolean;
  /** Los pagos de la contraseña (vigentes y anulados), del más antiguo al más nuevo. */
  pagos: PagoDeLaContrasenaDto[];
  /** `null` en una contraseña anulada. */
  estadoDePago: EstadoDePagoDto;
}

/** Una línea de la lista de contraseñas. */
export interface ContrasenaResumenDto {
  id: string;
  numero: string;
  fecha: string;
  fechaDePago: string;
  proveedorNombre: string;
  /** Cuántos documentos lleva (cargos y notas). */
  documentos: number;
  saldo: string;
  estado: EstadoDeContrasena;
  /** Vigente, con saldo y con la fecha prometida de pago ya pasada. */
  pagoVencido: boolean;
  /** `null` en una contraseña anulada. */
  estadoDePago: EstadoDePagoDto;
}

export interface PaginaDeContrasenasDto {
  elementos: ContrasenaResumenDto[];
  total: number;
  pagina: number;
  limite: number;
}

/** Una nota con saldo a favor que puede entrar en una contraseña. */
export interface NotaDisponibleDto {
  documentoId: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  saldoLibre: string;
}

/** Lo que el proveedor tiene para meter en una contraseña nueva. */
export interface DocumentosDisponiblesDto {
  cargos: CargoDeContrasenaDto[];
  notas: NotaDisponibleDto[];
  /** La mayor fecha de vencimiento de los cargos, o hoy si es anterior. */
  fechaDePagoPropuesta: string;
  /** Desde cuánto exige la ley pagar por el sistema bancario, con dos decimales (para el aviso de bancarización). */
  umbralDeBancarizacion: string;
}
