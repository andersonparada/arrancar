import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
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
  /** Lo deja `anulado` con quién, cuándo y por qué, y si estaba autorizado. */
  anular(id: string, anulacion: AnulacionDeDocumento): Promise<void>;
  eliminar(id: string): Promise<void>;
}

export interface AnulacionDeDocumento {
  anuladoPor: string;
  motivo: string;
  estabaAutorizado: boolean;
}

export interface RepositorioDeAplicaciones {
  /** Guarda lo que la nota rebaja de cada cargo (los montos ya salen del reparto, en centavos). */
  agregar(nota: DocumentoPorPagar, aplicaciones: readonly AplicacionACargo[]): Promise<void>;
  /** Lo que la nota rebajó de cada cargo y lo que le rebajaron a un cargo, en centavos. */
  hechasPorLaNota(notaId: string): Promise<AplicacionDeNota[]>;
  recibidasPorElCargo(cargoId: string): Promise<AplicacionDeNota[]>;
  /** Las deshace: lo aplicado vuelve al saldo del cargo (o al saldo libre de la nota). */
  borrarDeLaNota(notaId: string): Promise<void>;
  borrarDelCargo(cargoId: string): Promise<void>;
}

export interface ConsultasDeCargos {
  /**
   * Bloquea la factura (por su id de Libro de compras) para que nadie más aplique a la vez, y devuelve ella y luego sus
   * notas de débito vigentes, de la más antigua a la más nueva, cada una con lo que todavía debe.
   */
  paraAplicarUnaNota(facturaDeCompraId: string): Promise<CargoConSaldo[]>;
}

export interface CondicionesDeProveedores {
  /** Los días de crédito del proveedor; `null` si no tiene (o dejó el campo vacío). */
  diasDeCredito(proveedorId: string): Promise<number | null>;
}

export interface PlazoPorOmision {
  /** Los meses de crédito por omisión de la empresa. */
  meses(contexto: ContextoEmpresa): Promise<number>;
}
