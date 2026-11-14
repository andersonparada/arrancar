import type { EstadoDeContrasena } from '../../dominio/contrasena.js';
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
  puedeEditar: boolean;
  puedeAnular: boolean;
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
}
