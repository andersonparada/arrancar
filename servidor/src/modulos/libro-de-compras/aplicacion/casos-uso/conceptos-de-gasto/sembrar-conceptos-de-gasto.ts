import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { ConceptoDeGasto } from '../../../dominio/concepto-de-gasto.js';
import { CONCEPTOS_DE_GASTO_SUGERIDOS } from '../../../dominio/conceptos-de-gasto-iniciales.js';
import type { RepositorioConceptosDeGasto } from '../../puertos/repositorio-conceptos-de-gasto.js';

/**
 * Da a la empresa su lista sugerida de conceptos de gasto. Solo actúa si la empresa no tiene
 * ninguno (empresas nuevas o que activan el módulo después); una vez sembrada, el usuario manda y
 * nada se vuelve a agregar. Corre dentro de la unidad de trabajo de quien la llama.
 */
export class SembrarConceptosDeGasto {
  constructor(private readonly repositorio: RepositorioConceptosDeGasto) {}

  async ejecutar(operador: Operador): Promise<void> {
    if (await this.repositorio.hayAlguno()) return;
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const conceptos = CONCEPTOS_DE_GASTO_SUGERIDOS.map((datos) => ConceptoDeGasto.crear(empresaId, datos));
    await this.repositorio.sembrar(conceptos);
  }
}
