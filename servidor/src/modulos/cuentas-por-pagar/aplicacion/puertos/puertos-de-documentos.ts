import type { ContextoEmpresa } from '../../../core/compartido/aplicacion/contexto-empresa.js';
import type { DocumentoPorPagar } from '../../dominio/documento-por-pagar.js';
import type { AplicacionACargo, CargoConSaldo } from '../../dominio/reparto-de-nota-de-credito.js';

/** Lo que llega de Libro de compras; el resto (estado, id) lo pone el repositorio al guardar. */
export type DocumentoNuevo = Omit<DocumentoPorPagar, 'id' | 'estado'>;

export interface RepositorioDeDocumentos {
  /** Si el documento de Libro de compras ya está aquí. */
  existe(documentoId: string): Promise<boolean>;
  /** Guarda el documento como `pendiente`. */
  agregar(nuevo: DocumentoNuevo): Promise<DocumentoPorPagar>;
}

export interface RepositorioDeAplicaciones {
  /** Guarda lo que la nota rebaja de cada cargo (los montos ya salen del reparto, en centavos). */
  agregar(nota: DocumentoPorPagar, aplicaciones: readonly AplicacionACargo[]): Promise<void>;
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
