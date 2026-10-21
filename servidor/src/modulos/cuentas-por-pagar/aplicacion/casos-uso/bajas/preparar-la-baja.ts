import type { DocumentoConAplicaciones, DocumentoPorPagar } from '../../../dominio/documento-por-pagar.js';
import type { ReglaDeBaja } from '../../../dominio/reglas-de-baja.js';
import type { RepositorioDeAplicaciones } from '../../puertos/puertos-de-documentos.js';

/** Pasa el documento por cada regla, en orden; la primera que lo rechaza lanza su error y la baja no avanza. */
export async function revisarReglasDeBaja(
  reglas: readonly ReglaDeBaja[],
  guardado: DocumentoConAplicaciones,
): Promise<void> {
  for (const regla of reglas) await regla(guardado);
}

/**
 * Deshace lo aplicado por o a un documento que se da de baja: lo que rebajó una nota de crédito vuelve al saldo de sus
 * cargos y lo que rebajaron a una nota de débito vuelve al saldo libre de esas notas.
 */
export async function deshacerAplicaciones(
  aplicaciones: RepositorioDeAplicaciones,
  { id, tipo }: DocumentoPorPagar,
): Promise<void> {
  if (tipo === 'nota_de_credito') await aplicaciones.borrarDeLaNota(id);
  if (tipo === 'nota_de_debito') await aplicaciones.borrarDelCargo(id);
}
