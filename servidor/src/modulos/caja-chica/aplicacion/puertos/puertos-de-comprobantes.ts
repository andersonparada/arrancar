import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  CargoPorBancarizar,
  EvaluacionDeBancarizacion,
} from '../../../core/contratos/libro-de-compras.contratos.js';
import type { Comprobante } from '../../dominio/comprobantes.js';

/** Un documento del libro que llega a la bandeja; `documentoAfectadoId` ya es el comprobante de la factura. */
export interface DocumentoRecibido {
  documentoDeCompraId: string;
  proveedorId: string;
  fecha: string;
  montoCentavos: number;
  montoRetenidoCentavos: number;
  esNotaDeCredito: boolean;
  documentoAfectadoId: string | null;
  conActivoFijo: boolean;
}

/** Un vale de gasto: se crea ya dentro del fondo (asignado por quien lo registra). */
export interface ValeDeGastoNuevo {
  fondoId: string;
  fecha: string;
  montoCentavos: number;
  descripcion: string;
  pagadoA: string;
  conceptoDeGastoId: string;
  motivoSinDocumento: string;
  motivoSobreElTope: string | null;
  numero: number;
  anioDeNumero: number;
  asignadoPor: string;
}

/** Lo que se escribe al pasar un documento de la bandeja a un fondo. */
export interface AsignacionDeComprobante {
  fondoId: string;
  fecha: string;
  motivoSobreElTope: string | null;
  motivoConRetencion: string | null;
  sinBancarizar: boolean;
  asignadoPor: string;
}

export interface AnulacionDelComprobante {
  anuladoPor: string;
  motivo: string;
  fechaDeAnulacion: string;
}

/** Las tablas tienen seguridad por empresa y por alcance del fondo (RLS); la bandeja la ve quien tiene el permiso. */
export interface RepositorioDeComprobantes {
  agregarDocumento(nuevo: DocumentoRecibido): Promise<string>;
  agregarVale(nuevo: ValeDeGastoNuevo): Promise<string>;
  buscar(id: string): Promise<Comprobante | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<Comprobante | null>;
  /** El comprobante de un documento del libro, esté donde esté. */
  buscarDelDocumento(documentoDeCompraId: string): Promise<Comprobante | null>;
  asignar(id: string, asignacion: AsignacionDeComprobante): Promise<void>;
  /** Limpia fondo, asignación, motivos y marcas, y devuelve la fecha a la de emisión. */
  devolverALaBandeja(id: string, fechaDeEmision: string): Promise<void>;
  anular(id: string, anulacion: AnulacionDelComprobante): Promise<void>;
  /** Borra el comprobante (solo cuando el libro elimina su documento). */
  eliminar(id: string): Promise<void>;
  /** Cuántas notas de crédito vigentes tiene la factura dentro de un fondo (las de la bandeja no la atan). */
  contarNotasVigentes(facturaId: string): Promise<number>;
}

export interface FiltroDeBandeja {
  proveedorId?: string;
  desde?: string;
  hasta?: string;
  conRetencion?: boolean;
}

export type EstadoDeLosComprobantes = 'pendiente' | 'repuesto' | 'anulado' | 'todos';

export interface FiltroDeComprobantes {
  fondoId: string;
  estado: EstadoDeLosComprobantes;
}

export interface ConsultasDeComprobantes {
  /** Los documentos vigentes sin fondo, del más viejo al más nuevo. */
  bandeja(filtro: FiltroDeBandeja): Promise<Comprobante[]>;
  delFondo(filtro: FiltroDeComprobantes): Promise<Comprobante[]>;
}

/** Las variables de configuración que usan los comprobantes. */
export interface ConfiguracionDeComprobantes {
  topePorOmisionCentavos(operador: Operador): Promise<number>;
  valesDeGasto(operador: Operador): Promise<{ permitidos: boolean; topeCentavos: number }>;
}

/** Lee de Libro de compras que el concepto de gasto exista y esté activo. */
export interface ConceptosDeGasto {
  estaActivo(conceptoId: string): Promise<boolean>;
}

/** La bancarización de un pago en efectivo la evalúa el libro (orden `libro-de-compras.evaluar_bancarizacion`). */
export interface BancarizacionDelLibro {
  evaluar(operador: Operador, pedido: PedidoDeEvaluacion): Promise<EvaluacionDeBancarizacion>;
}

export interface PedidoDeEvaluacion {
  proveedorId: string;
  proveedorNombre: string;
  fecha: string;
  montoEnEfectivoCentavos: number;
  cargos: CargoPorBancarizar[];
}

/** Lo pagado en efectivo al proveedor por todos los fondos de la empresa (aunque el usuario no los vea). */
export interface PagosDeCajaChica {
  /** Suma de `monto + monto_retenido` de los comprobantes asignados del proveedor en el mes (§5.4 h). */
  delProveedorEnElMes(proveedorId: string, mes: string): Promise<{ totalCentavos: number; cantidad: number }>;
}
