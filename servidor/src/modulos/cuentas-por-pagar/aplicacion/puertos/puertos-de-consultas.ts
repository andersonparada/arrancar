import type { CausaDeAjuste } from '../../dominio/ajustes.js';
import type { NotaLibreDelSistemaAnterior } from '../../dominio/notas-posteriores.js';
import type { DocumentoPorPagar, FormaDeAplicacion } from '../../dominio/documento-por-pagar.js';
import type { LineaDePago, LineaDeReintegro, PagoVigenteDelCargo } from '../../dominio/pagos.js';
import type { ProveedorConDocumentosDto } from '../dto/documento-por-pagar.dto.js';
import type { EstadoDeDocumento, OrigenDeDocumento, TipoDeDocumento } from '../../dominio/tipos-de-documento.js';

/** Los filtros de la lista de documentos; todos opcionales. */
export interface FiltroDeDocumentosPorPagar {
  proveedorId?: string;
  /** Un estado, o `vigente` (todo menos lo anulado) o `todos`. */
  estado?: EstadoDeDocumento | 'vigente' | 'todos';
  tipo?: TipoDeDocumento;
  origen?: OrigenDeDocumento;
  /** Fecha de emisión desde y hasta (`AAAA-MM-DD`), incluidas. */
  emitidosDesde?: string;
  emitidosHasta?: string;
  /** Solo los cargos con saldo cuyo vencimiento ya pasó. */
  soloVencidos?: boolean;
  /** Solo los cargos con saldo por pagar y las notas de crédito con saldo libre. */
  conSaldo?: boolean;
  /** Solo los documentos que no están en una contraseña vigente. */
  sinContrasena?: boolean;
}

/** Qué página de la lista se pide: de 1 en adelante, con hasta `limite` documentos. */
export interface PaginacionDeDocumentos {
  pagina: number;
  limite: number;
}

/** Datos del documento que viven en Libro de compras (no se copian aquí) y del proveedor. Un saldo inicial no tiene libro. */
export interface DatosDelLibro {
  proveedorNombre: string;
  /** El NIT del proveedor; nulo si el tercero no tiene. */
  proveedorNit: string | null;
  /** Nulos en un saldo inicial. */
  fechaRecepcion: string | null;
  periodo: string | null;
  /** Cómo se anuló en Libro de compras; todo nulo si el documento no está anulado. */
  anulacion: AnulacionEnElLibro;
}

export interface AnulacionEnElLibro {
  causa: string | null;
  motivo: string | null;
  anuladoPor: string | null;
  /** Nombres y apellidos de quien anuló; `null` si no se pudo leer al usuario. */
  anuladoPorNombre: string | null;
  anuladoEn: Date | null;
}

/** Un documento con lo que se calcula de las demás tablas; el dinero va en centavos. */
export interface FilaDeDocumento {
  documento: DocumentoPorPagar;
  libro: DatosDelLibro;
  /** Cuándo se creó la fila (instante ISO). */
  creadoEn: string;
  /** Lo que las notas de crédito rebajaron de este cargo. */
  aplicadoAlCargoCentavos: number;
  /** Lo que esta nota de crédito rebajó de cargos. */
  aplicadoPorLaNotaCentavos: number;
  /** Lo que se dio de baja con ajustes vigentes: del saldo libre de esta nota, o la diferencia menor de este cargo. */
  ajustadoCentavos: number;
  ajustesVigentes: number;
  /** Los pagos vigentes de este cargo (fecha y monto), también los posfechados; vacío en una nota. */
  pagosVigentes: PagoVigenteDelCargo[];
  /** Lo que los reintegros vigentes devolvieron contra esta nota. */
  reintegradoCentavos: number;
  reintegrosVigentes: number;
  /** Aplicaciones manuales que recibió este cargo. */
  aplicacionesManualesRecibidas: number;
  notasVigentes: number;
  notasEnTotal: number;
  /** La contraseña vigente en que está el documento (`numero` ya formateado: `15` o `2026-15`); `null` si no está en ninguna. */
  contrasena: { id: string; numero: string } | null;
}

export interface NotaDeUnDocumento {
  id: string;
  documentoId: string | null;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  totalCentavos: number;
  /** Lo que la nota rebajó del documento consultado. */
  aplicadoAlDocumentoCentavos: number;
}

export interface AplicacionConDatos {
  id: string;
  forma: FormaDeAplicacion;
  /** `AAAA-MM-DD`. */
  fecha: string;
  referencia: string | null;
  notaId: string;
  notaSerie: string | null;
  notaNumero: string;
  cargoId: string;
  cargoSerie: string | null;
  cargoNumero: string;
  montoCentavos: number;
}

/** Un ajuste con los nombres de quien lo hizo y de quien lo anuló, para la ficha de la nota. */
export interface AjusteConDatos {
  id: string;
  montoCentavos: number;
  fecha: string;
  causa: CausaDeAjuste;
  motivo: string;
  referencia: string | null;
  estado: 'vigente' | 'anulado';
  creadoPorNombre: string | null;
  /** Instante en ISO (UTC). */
  creadoEn: string;
  anulacion: { motivo: string; anuladoPorNombre: string | null; anuladoEn: string | null } | null;
}

/** Las cuentas del proveedor en la empresa: lo que se debe y lo que las notas dejaron a favor. */
export interface TotalesDelProveedor {
  proveedorNombre: string;
  porPagarCentavos: number;
  vencidoCentavos: number;
  cargosConSaldo: number;
}

export interface NotaConSaldoLibre {
  id: string;
  documentoId: string | null;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  saldoLibreCentavos: number;
}

/** La factura del sistema anterior que cita una nota, tal como está guardada en Libro de compras. */
export interface FacturaAnteriorDeLaNotaDto {
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
}

/** Las consultas de la bandeja, la lista y la ficha; las tablas tienen RLS por empresa. */
export interface ConsultasDeDocumentos {
  listar(
    filtro: FiltroDeDocumentosPorPagar,
    paginacion: PaginacionDeDocumentos,
    hoy: string,
  ): Promise<{ filas: FilaDeDocumento[]; total: number }>;
  /** Lo pendiente, del más antiguo al más nuevo, hasta `limite`; con el total que hay. */
  bandeja(limite: number): Promise<{ filas: FilaDeDocumento[]; total: number }>;
  buscar(id: string): Promise<FilaDeDocumento | null>;
  /** Las notas de crédito y de débito que corrigen al documento, también las anuladas, de la más antigua a la más nueva. */
  notasDe(documento: DocumentoPorPagar): Promise<NotaDeUnDocumento[]>;
  /** Lo que el documento rebajó (si es nota de crédito) o le rebajaron (si es cargo), con los datos de los dos lados. */
  aplicacionesDe(documento: DocumentoPorPagar): Promise<AplicacionConDatos[]>;
  /** Una aplicación con los datos de la nota y del cargo; `null` si no existe en la empresa. */
  aplicacion(id: string): Promise<AplicacionConDatos | null>;
  /** Los ajustes de una nota de crédito (también los anulados), del más antiguo al más nuevo. */
  ajustesDe(documentoId: string): Promise<AjusteConDatos[]>;
  /** Lo que los pagos entregaron a un cargo, vigentes y anulados, del más antiguo al más nuevo. */
  pagosDe(cargoId: string): Promise<LineaDePago[]>;
  /** Lo que los reintegros devolvieron contra una nota, vigentes y anulados, del más antiguo al más nuevo. */
  reintegrosDe(notaId: string): Promise<LineaDeReintegro[]>;
  /** Las notas del libro que citan una factura del sistema anterior y no están enlazadas a ningún saldo inicial. */
  notasLibresDelSistemaAnterior(): Promise<NotaLibreDelSistemaAnterior[]>;
  /** La factura anterior que cita una nota del libro (por su id en Libro de compras); `null` si no cita ninguna. */
  facturaAnteriorDeLaNota(documentoId: string): Promise<FacturaAnteriorDeLaNotaDto | null>;
  /** Los cargos vigentes del proveedor que todavía deben algo (los que una nota puede rebajar), sin orden fijo. */
  cargosConSaldoDe(proveedorId: string): Promise<FilaDeDocumento[]>;
}

/** Las cuentas de un proveedor en la empresa activa. */
export interface ConsultasDeSaldos {
  /** `null` si el proveedor no existe en la cuenta. */
  totalesDelProveedor(proveedorId: string, hoy: string): Promise<TotalesDelProveedor | null>;
  notasConSaldoLibre(proveedorId: string): Promise<NotaConSaldoLibre[]>;
  /** Los proveedores que tienen algún documento por pagar en la empresa activa, por nombre. */
  proveedoresConDocumentos(): Promise<ProveedorConDocumentosDto[]>;
}
