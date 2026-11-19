import type { AjusteDelDocumento, AplicacionDelDocumento } from './tipos-de-notas';
import type { EstadoDePago, EstadoDeUnPago, FormaDePago } from './tipos-de-pagos';
import type { ReintegroDelDocumento } from './tipos-de-reintegros';

export type * from './tipos-de-notas';

export type TipoDeDocumento =
  | 'factura'
  | 'factura_pequeno_contribuyente'
  | 'factura_pequeno_contribuyente_electronico'
  | 'factura_contribuyente_agropecuario'
  | 'factura_primario_pecuario'
  | 'factura_especial'
  | 'nota_de_credito'
  | 'nota_de_debito'
  | 'recibo';

export type OrigenDelDocumento = 'libro_de_compras' | 'saldo_inicial';
export type ClaseDeDocumento = 'cargo' | 'abono';
export type EstadoDeDocumento = 'pendiente' | 'registrado' | 'autorizado' | 'anulado';
export type EstadoBuscado = EstadoDeDocumento | 'vigente' | 'todos';
export type CausaDeAnulacion = 'error_de_captura' | 'fel_anulada_por_el_emisor' | 'no_corresponde_a_la_empresa';

/** Las condiciones de pago de un proveedor; `diasDeCredito` nulo es el plazo por omisión (un mes). */
export interface CondicionesDeProveedor {
  diasDeCredito: number | null;
  contarDesdeLaRecepcion: boolean;
}

/** Lo que trae la lectura: las condiciones y el plazo por omisión (meses, 0 = de contado) de la empresa activa. */
export interface CondicionesConPlazoPorOmision extends CondicionesDeProveedor {
  mesesPorOmision: number;
}

/** Lo que el servidor dice que se puede hacer con un documento (el permiso del usuario se revisa aparte). */
export interface AccionesDelDocumento {
  puedeRegistrar: boolean;
  puedeAutorizar: boolean;
  puedeDesautorizar: boolean;
  puedeCambiarVencimiento: boolean;
  puedeAnular: boolean;
  puedeEliminar: boolean;
  /** Una nota de crédito con saldo libre se puede aplicar a otro cargo del proveedor. */
  puedeAplicar: boolean;
  /** Una nota de crédito registrada o autorizada con saldo libre se puede ajustar. */
  puedeAjustar: boolean;
  /** Una nota de crédito registrada o autorizada con saldo libre se puede reintegrar (el proveedor devuelve el dinero). */
  puedeReintegrar: boolean;
}

/** Lo que un pago entregó a un cargo; `comprometido` es un pago vigente con fecha posterior a hoy (cheque posfechado). */
export interface PagoDelDocumento {
  pagoId: string;
  /** Como se lee: `15` o `2026-15`. */
  numero: string;
  forma: FormaDePago;
  fecha: string;
  estado: EstadoDeUnPago;
  contrasenaId: string;
  monto: string;
  /** La retención que este pago «descontó» (constancia); no resta del saldo. */
  retencionDescontada: string;
  comprometido: boolean;
}

/** Un documento tal como lo ven la bandeja, la lista y la ficha; el dinero viaja como texto. */
export interface DocumentoPorPagar extends AccionesDelDocumento {
  id: string;
  origen: OrigenDelDocumento;
  /** El id del documento en Libro de compras; `null` en un saldo inicial. */
  documentoId: string | null;
  tipo: TipoDeDocumento;
  clase: ClaseDeDocumento;
  estado: EstadoDeDocumento;
  proveedorId: string;
  proveedorNombre: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  /** `null` en un saldo inicial (no pasó por el libro de compras). */
  fechaRecepcion: string | null;
  periodo: string | null;
  vencimiento: string | null;
  vencido: boolean;
  documentoAfectadoId: string | null;
  /** La nota corrige una factura del sistema anterior: su saldo inicial (con `documentoAfectadoId`) o ninguno. */
  facturaDelSistemaAnterior: boolean;
  tieneActivoFijo: boolean;
  total: string;
  retenciones: string;
  neto: string;
  aplicado: string;
  /** Lo dado de baja con ajustes vigentes (solo notas de crédito; en un cargo es 0). */
  ajustado: string;
  /** En un cargo, la deuda (también lo comprometido con cheques posfechados); en una nota de crédito, su saldo libre (a favor). */
  saldo: string;
  /** Lo que aún se puede pagar: `saldo` menos `comprometido`. */
  disponible: string;
  /** La fecha del cheque posfechado más lejano; `null` si no hay. */
  comprometidoHasta: string | null;
  /** Cuántos pagos posfechados vigentes tiene el cargo. */
  chequesPosfechados: number;
  /** Solo una nota de crédito: lo que los reintegros vigentes devolvieron. */
  reintegrado: string;
  /** Solo un cargo: lo que los pagos vigentes entregaron con fecha de hoy o anterior. */
  pagado: string;
  /** Solo un cargo: lo de pagos vigentes con fecha posterior a hoy (cheques posfechados); el saldo ya lo resta. */
  comprometido: string;
  /** Solo un cargo vigente; `null` en una nota de crédito o un documento anulado. */
  estadoDePago: EstadoDePago | null;
  /** El usuario lo ingresó en Libro de compras o lo completó: para autorizarlo necesita `autorizar-propios`. */
  esPropio: boolean;
  registradoEn: string | null;
  autorizadoEn: string | null;
  autorizacionPropia: boolean;
  /** Solo en saldos iniciales: lo que se debía al cierre del día anterior a la fecha de inicio. */
  saldoAlInicio: string | null;
  retencionesPorPracticar: string | null;
  /** Cómo se llamaba el documento en el sistema anterior. */
  referencia: string | null;
  /** Pagos y notas aplicados antes de la fecha de inicio (ya descontados de `saldoAlInicio`). */
  anterioresAlInicio: string | null;
  /** La contraseña vigente en que está (`numero` ya formateado: `15` o `2026-15`); `null` si no está en ninguna. */
  contrasena: { id: string; numero: string } | null;
}

export interface PaginaDeDocumentos {
  elementos: DocumentoPorPagar[];
  total: number;
  pagina: number;
  limite: number;
}

export interface Bandeja {
  elementos: DocumentoPorPagar[];
  /** Si pasa de `elementos`, la bandeja se recortó. */
  total: number;
}

export interface NotaDelDocumento {
  id: string;
  documentoId: string | null;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  total: string;
  aplicadoAEsteDocumento: string;
}

/** Cómo se anuló un documento; cualquier dato puede faltar en anulaciones antiguas. */
export interface AnulacionDelDocumento {
  causa: CausaDeAnulacion | null;
  motivo: string | null;
  /** Id del usuario que anuló. */
  anuladoPor: string | null;
  /** Nombres y apellidos de quien anuló; `null` si no se pudo leer al usuario. */
  anuladoPorNombre: string | null;
  /** Instante en ISO (UTC). */
  anuladoEn: string | null;
}

export interface FichaDelDocumento extends DocumentoPorPagar {
  notas: NotaDelDocumento[];
  aplicaciones: AplicacionDelDocumento[];
  /** Solo en una nota de crédito. */
  ajustes: AjusteDelDocumento[];
  /** Solo en una nota de crédito: la fecha más antigua de un ajuste; `null` si nada la limita. */
  fechaMinimaDeAjuste: string | null;
  /** Solo en una nota de crédito: lo más que puede ajustarse como «Diferencia menor» (cero la apaga). */
  topeDiferenciaMenor: string;
  /** Solo en un cargo: lo que los pagos le entregaron, vigentes y anulados. */
  pagos: PagoDelDocumento[];
  /** Solo en una nota de crédito: sus reintegros, vigentes y anulados. */
  reintegros: ReintegroDelDocumento[];
  /** `null` si el documento no está anulado. */
  anulacion: AnulacionDelDocumento | null;
  /** Solo una nota sobre una factura anterior que no tiene saldo inicial: los datos que citó en Libro de compras. */
  facturaAnterior: FacturaAnteriorDeLaNota | null;
}

/** La factura del sistema anterior que cita una nota. */
export interface FacturaAnteriorDeLaNota {
  tipo: TipoDeDocumento;
  serie: string | null;
  numero: string;
  fechaEmision: string;
}

export interface SaldoDeudor {
  id: string;
  documentoId: string;
  serie: string | null;
  numero: string;
  fechaEmision: string;
  saldoLibre: string;
}

/** Un cheque posfechado de un proveedor. */
export interface PosfechadoDelProveedor {
  numeroDeCheque: string | null;
  fecha: string;
  monto: string;
}

/** Los cheques posfechados de apertura que ningún pago ha ligado y que podrían ser de un proveedor (AP-0). */
export interface ChequesDeAperturaSinLigar {
  cantidad: number;
  total: string;
}

/** Lo que la empresa debe a un proveedor; los saldos deudores van aparte y no se restan. */
export interface SaldoDelProveedor {
  proveedorId: string;
  proveedorNombre: string;
  /** La deuda: también lo comprometido con cheques posfechados (la cifra de R1). */
  porPagar: string;
  /** La parte vencida de la deuda; cuenta lo comprometido. */
  vencido: string;
  /** La parte de la deuda cubierta con cheques posfechados. */
  comprometido: string;
  /** Lo que aún se puede pagar: `porPagar` menos `comprometido`. */
  disponible: string;
  /** La parte vencida de lo comprometido. */
  vencidoComprometido: string;
  /** Hasta 10 cheques posfechados, del más próximo al más lejano. */
  posfechados: PosfechadoDelProveedor[];
  cargosConSaldo: number;
  chequesDeAperturaSinLigar: ChequesDeAperturaSinLigar;
  saldosDeudores: string;
  notasConSaldoLibre: SaldoDeudor[];
}

/** Los filtros que acepta la lista; lo que falta no filtra. */
export interface ConsultaDeDocumentos {
  proveedorId?: string;
  estado?: EstadoBuscado;
  tipo?: TipoDeDocumento;
  origen?: OrigenDelDocumento;
  emitidosDesde?: string;
  emitidosHasta?: string;
  soloVencidos?: boolean;
  /** Solo lo que no está en una contraseña vigente. */
  sinContrasena?: boolean;
  /** Cargos con saldo por pagar y notas con saldo libre. */
  conSaldo?: boolean;
  /** Solo los cargos vigentes en ese estado de pago. */
  estadoDePago?: EstadoDePago;
  pagina?: number;
  limite?: number;
}

export interface DocumentoACompletar {
  id: string;
  vencimiento?: string;
}

/** El documento anulado y los avisos de Libro de compras (período declarado, retenciones por resolver). */
export interface DocumentoAnulado extends DocumentoPorPagar {
  avisos: string[];
}

export interface DatosDeAnulacion {
  causa: CausaDeAnulacion;
  motivo: string;
}

/** Un proveedor para el filtro de la lista. */
export interface ProveedorParaFiltro {
  id: string;
  nombre: string;
  activo: boolean;
}
