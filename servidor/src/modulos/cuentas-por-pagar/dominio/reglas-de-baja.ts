import type { DocumentoConAplicaciones } from './documento-por-pagar.js';
import { CargoConNotasAplicadas, DocumentoAutorizado } from './errores.js';

/**
 * Una regla que puede rechazar la baja de un documento (anularlo o eliminarlo) lanzando su error. Las listas de reglas se
 * arman al componer el módulo, así que cada paso nuevo suma las suyas sin tocar los casos de uso: contraseñas (CP3) y
 * pagos (CP4).
 */
export type ReglaDeBaja = (guardado: DocumentoConAplicaciones) => void | Promise<void>;

/** Un documento autorizado ya se provisionó: solo se anula. */
export const noEstarAutorizado: ReglaDeBaja = ({ documento }) => {
  if (documento.estado === 'autorizado') throw new DocumentoAutorizado();
};

/**
 * Un cargo con notas de crédito aplicadas no se da de baja. Las notas de débito sí: lo que les aplicaron vuelve al saldo
 * libre de esas notas. Libro de compras no anula una factura con notas vigentes, pero se revisa igual.
 */
export const noTenerNotasAplicadas: ReglaDeBaja = ({ documento, recibidas }) => {
  const esFactura = documento.tipo !== 'nota_de_credito' && documento.tipo !== 'nota_de_debito';
  if (esFactura && recibidas.length > 0) throw new CargoConNotasAplicadas();
};

export const REGLAS_PARA_ANULAR: readonly ReglaDeBaja[] = [noTenerNotasAplicadas];

export const REGLAS_PARA_ELIMINAR: readonly ReglaDeBaja[] = [noEstarAutorizado, noTenerNotasAplicadas];
