import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { Operador } from '../../../core/compartido/aplicacion/operador.js';
import type {
  EvaluacionDeBancarizacion,
  CargoPorBancarizar,
  TipoDeDocumentoDeCompra,
} from '../../../core/contratos/libro-de-compras.contratos.js';
import type { Gasto, TratamientoSinDocumento } from '../../dominio/gastos.js';

/** Un documento del libro que llega a la bandeja. */
export interface GastoDeDocumentoNuevo {
  id: string;
  documentoDeCompraId: string;
  resta: boolean;
  proveedorId: string;
  /** `AAAA-MM-DD`: la emisión; al asignar se puede cambiar. */
  fecha: string;
  montoCentavos: number;
  montoRetenidoCentavos: number;
  conActivoFijo: boolean;
}

/** Un gasto sin documento, que nace asignado al anticipo. */
export interface GastoSinDocumentoNuevo {
  id: string;
  anticipoId: string;
  fecha: string;
  montoCentavos: number;
  descripcion: string;
  pagadoA: string;
  conceptoDeGastoId: string;
  motivoSinDocumento: string;
  tratamiento: TratamientoSinDocumento;
  asignadoPor: string;
}

/** Lo que cambia al asignar un documento de la bandeja a un anticipo. */
export interface AsignacionDeGasto {
  anticipoId: string;
  fecha: string;
  asignadoPor: string;
  /** El de la excepción de retención; `null` si el documento no lleva retención. */
  motivoConRetencion: string | null;
  sinBancarizar: boolean;
}

/** Cómo se quita de un anticipo un gasto sin documento. */
export interface AnulacionDeGasto {
  anuladoPor: string;
  motivo: string;
  fechaDeAnulacion: string;
}

export interface RepositorioDeGastos {
  agregarDocumento(gasto: GastoDeDocumentoNuevo): Promise<void>;
  agregarSinDocumento(gasto: GastoSinDocumentoNuevo): Promise<void>;
  buscar(id: string): Promise<Gasto | null>;
  /** Igual que `buscar`, y deja la fila bloqueada para este caso de uso. */
  bloquear(id: string): Promise<Gasto | null>;
  /** El gasto de un documento del libro, en cualquier estado; `null` si nunca llegó. */
  delDocumento(documentoDeCompraId: string): Promise<Gasto | null>;
  asignar(id: string, asignacion: AsignacionDeGasto): Promise<void>;
  /** Limpia el anticipo, quién asignó, el motivo de la retención y la marca de bancarización: vuelve a la bandeja con su fecha de emisión. */
  devolverALaBandeja(id: string, fechaDeEmision: string): Promise<void>;
  anular(id: string, anulacion: AnulacionDeGasto): Promise<void>;
  /** Borra la fila (solo cuando el libro elimina el documento: la llave obliga a quitarla antes). */
  eliminar(id: string): Promise<void>;
}

/** Lo que Cuentas por liquidar lee del documento en Libro de compras (no viaja en la orden y no cambia). */
export interface DatosDelDocumentoDelLibro {
  tipo: TipoDeDocumentoDeCompra;
  serie: string | null;
  numero: string;
  /** `AAAA-MM-DD`. */
  fechaEmision: string;
  proveedorNombre: string;
  /** Por qué quedó fuera del libro; `null` si va en él. */
  motivoFueraDelLibro: string | null;
}

export interface DocumentosDelLibro {
  /** @throws Error si el documento no existe: la orden lo recibe con su fila ya guardada. */
  datosDe(documentoId: string): Promise<DatosDelDocumentoDelLibro>;
}

/** La orden al libro para evaluar la bancarización de un pago en efectivo (el anticipo es dinero que ya salió). */
export interface BancarizacionDelLibro {
  evaluar(
    operador: Operador,
    pedido: {
      proveedorId: string;
      proveedorNombre: string;
      fecha: string;
      montoEnEfectivoCentavos: number;
      cargos: CargoPorBancarizar[];
    },
  ): Promise<EvaluacionDeBancarizacion>;
}

/** Un gasto con lo que se muestra de su documento. */
export interface GastoConDocumento {
  gasto: Gasto;
  documento: DatosDelDocumentoDelLibro | null;
}

export interface FiltroDeGastos {
  /** Un anticipo: sus gastos vigentes. `null`: la bandeja (documentos vigentes sin anticipo). */
  anticipoId: string | null;
  proveedorId?: string;
  /** Sobre la fecha del documento. */
  desde?: string;
  hasta?: string;
  conRetencion?: boolean;
}

/** Lo que Cuentas por liquidar pagó a un proveedor en un mes, con los anticipos de dónde sale. */
export interface PagadoEnElMes {
  totalCentavos: number;
  anticipos: Array<{ numero: number; anioDeNumero: number }>;
}

export interface ConsultasDeGastos {
  listar(filtro: FiltroDeGastos): Promise<GastoConDocumento[]>;
  /** Suma `monto + monto_retenido` de los gastos de documento asignados, vigentes, que no restan, del proveedor y del mes. */
  pagadoAlProveedorEnElMes(proveedorId: string, mes: string): Promise<PagadoEnElMes>;
}

/** Lo que el gasto valida de otras tablas. */
export interface ReferenciasDelGasto {
  /** El concepto de gasto del libro existe en la empresa y está activo. */
  conceptoDeGastoActivo(conceptoId: string): Promise<boolean>;
}

/** La configuración de los gastos (empresa → instalación → predeterminado). */
export interface PoliticaDeGastos {
  sinDocumentoPermitido(contexto: ContextoEmpresa): Promise<boolean>;
}
