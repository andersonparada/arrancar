import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { CambioDeCondiciones, CondicionesDeProveedor } from '../../dominio/condiciones-de-proveedor.js';
import type {
  AplicacionDeNota,
  DocumentoConAplicaciones,
  DocumentoPorPagar,
} from '../../dominio/documento-por-pagar.js';
import type { AplicacionACargo, CargoConSaldo } from '../../dominio/reparto-de-nota-de-credito.js';

/** Lo que llega de Libro de compras; el resto (id, estado, quién lo completó o autorizó) lo pone el repositorio. */
export type DocumentoNuevo = Pick<
  DocumentoPorPagar,
  | 'documentoId'
  | 'serie'
  | 'numero'
  | 'tipo'
  | 'proveedorId'
  | 'documentoAfectadoId'
  | 'fechaEmision'
  | 'totalCentavos'
  | 'retencionesCentavos'
  | 'tieneActivoFijo'
  | 'vencimiento'
>;

export interface RepositorioDeDocumentos {
  /** Si el documento de Libro de compras ya está aquí. */
  existe(documentoId: string): Promise<boolean>;
  /** Guarda el documento como `pendiente`. */
  agregar(nuevo: DocumentoNuevo): Promise<DocumentoPorPagar>;
  /** Busca por el id del documento de Libro de compras; con `bloquear`, deja la fila y las que cuelgan de ella para este caso de uso. */
  buscarPorDocumentoDeCompra(documentoId: string, bloquear: boolean): Promise<DocumentoConAplicaciones | null>;
  /** Busca por el id de aquí; con `bloquear`, igual que `buscarPorDocumentoDeCompra`. */
  buscarPorId(id: string, bloquear: boolean): Promise<DocumentoConAplicaciones | null>;
  /** Lo pasa de `pendiente` a `registrado`, con quién y cuándo; los cargos quedan con su vencimiento definitivo. */
  registrar(id: string, completado: DocumentoCompletado): Promise<void>;
  cambiarVencimiento(id: string, vencimiento: string): Promise<void>;
  /** Lo pasa de `registrado` a `autorizado`; `autorizacionPropia` deja marcada la excepción a la separación de funciones. */
  autorizar(id: string, autorizacion: AutorizacionDeDocumento): Promise<void>;
  /** Lo devuelve de `autorizado` a `registrado`. */
  desautorizar(id: string): Promise<void>;
  /** Lo deja `anulado` con quién, cuándo y por qué, y si estaba autorizado. */
  anular(id: string, anulacion: AnulacionDeDocumento): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export interface DocumentoCompletado {
  registradoPor: string;
  /** `null` en una nota de crédito, que no vence. */
  vencimiento: string | null;
}

export interface AutorizacionDeDocumento {
  autorizadoPor: string;
  autorizacionPropia: boolean;
}

export interface AnulacionDeDocumento {
  anuladoPor: string;
  motivo: string;
  estabaAutorizado: boolean;
}

/** Lo común a las filas que crea una misma aplicación. */
export interface DatosDeAplicacion {
  forma: 'automatica' | 'manual';
  /** `AAAA-MM-DD`. */
  fecha: string;
  referencia: string | null;
}

export interface RepositorioDeAplicaciones {
  /**
   * Guarda lo que la nota rebaja de cada cargo (los montos ya salen del reparto, en centavos), con la forma, la fecha
   * desde la que rebaja y, en las manuales, la referencia del acuerdo.
   */
  agregar(nota: DocumentoPorPagar, aplicaciones: readonly AplicacionACargo[], datos: DatosDeAplicacion): Promise<void>;
  /** Lo que la nota rebajó de cada cargo y lo que le rebajaron a un cargo, en centavos. */
  hechasPorLaNota(notaId: string): Promise<AplicacionDeNota[]>;
  recibidasPorElCargo(cargoId: string): Promise<AplicacionDeNota[]>;
  /** Las deshace: lo aplicado vuelve al saldo del cargo (o al saldo libre de la nota). */
  borrarDeLaNota(notaId: string): Promise<void>;
  borrarDelCargo(cargoId: string): Promise<void>;
  /** Quita una sola aplicación (la que se hizo a mano). */
  borrar(aplicacionId: string): Promise<void>;
}

export interface ConsultasDeCargos {
  /**
   * Bloquea la factura (por su id de Libro de compras) para que nadie más aplique a la vez, y devuelve ella y luego sus
   * notas de débito vigentes, de la más antigua a la más nueva, cada una con lo que todavía debe.
   */
  paraAplicarUnaNota(facturaDeCompraId: string): Promise<CargoConSaldo[]>;
}

export interface CondicionesDeProveedores {
  /** Las condiciones del proveedor; sin ninguna guardada, las de por omisión. */
  deProveedor(proveedorId: string): Promise<CondicionesDeProveedor>;
  /** Si el proveedor existe en la cuenta activa. */
  existeElProveedor(proveedorId: string): Promise<boolean>;
  /** Guarda lo que cambió (crea la fila si no había); lo que el cambio no trae se queda como estaba. */
  guardar(proveedorId: string, cambio: CambioDeCondiciones): Promise<void>;
}

/** Datos del documento que se quedan en Libro de compras y no viajan en la orden `recibir_documento`. */
export interface DocumentosDeCompra {
  /** La fecha de recepción, la serie y el número con que se registró el documento. */
  datosDeRecepcion(documentoId: string): Promise<DatosDeRecepcion>;
  /** Bloquea la fila del documento en Libro de compras (solo para fijar el orden de bloqueo; no la cambia). */
  bloquear(documentoId: string): Promise<void>;
}

/** Lo que Cuentas por pagar lee de Libro de compras al recibir un documento. */
export interface DatosDeRecepcion {
  /** `AAAA-MM-DD`. */
  fechaRecepcion: string;
  serie: string | null;
  numero: string;
}

export interface PlazoPorOmision {
  /** Los meses de crédito por omisión de la empresa. */
  meses(contexto: ContextoEmpresa): Promise<number>;
}

/** Desde cuándo existe cada documento ante la ley: su recepción en Libro de compras. */
export interface FechasDeEntrada {
  /**
   * La fecha de recepción (`AAAA-MM-DD`) de cada documento, por su id de aquí; `null` en un saldo inicial, que no pasó
   * por el libro (su límite es la fecha de inicio de la empresa). Lee sin bloquear la fila del libro, para no invertir el
   * orden de bloqueo «libro, luego Cuentas por pagar».
   */
  deDocumentos(ids: readonly string[]): Promise<Map<string, string | null>>;
}

/** El total desde el cual compensar un cargo pide guardar por escrito el acuerdo (bancarización, Decreto 20-2006). */
export interface UmbralDeBancarizacion {
  /** El umbral de la instalación, en centavos. */
  centavos(contexto: ContextoEmpresa): Promise<number>;
}
