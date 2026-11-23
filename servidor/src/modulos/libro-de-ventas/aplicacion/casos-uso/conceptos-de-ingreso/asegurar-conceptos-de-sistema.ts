import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { ConceptoDeIngreso } from '../../../dominio/concepto-de-ingreso.js';
import { CONCEPTOS_DE_INGRESO_SUGERIDOS } from '../../../dominio/conceptos-de-ingreso-iniciales.js';
import type { DependenciasDeConceptosDeIngreso } from './dependencias-de-conceptos-de-ingreso.js';

/**
 * Deja en la empresa los conceptos de sistema (los que el módulo necesita para sus reglas, p. ej. la venta de activo
 * fijo) aunque la lista sugerida no se haya sembrado: el primer concepto puede entrar por crear o importar, sin `.ver`.
 * Corre dentro de la unidad de trabajo de quien la llama.
 */
export class AsegurarConceptosDeSistema {
  constructor(private readonly dependencias: Pick<DependenciasDeConceptosDeIngreso, 'repositorio'>) {}

  async ejecutar(operador: Operador): Promise<void> {
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    for (const { datos, claveDeSistema } of CONCEPTOS_DE_INGRESO_SUGERIDOS) {
      if (claveDeSistema === null) continue;
      await this.dependencias.repositorio.asegurarDeSistema(ConceptoDeIngreso.crear(empresaId, datos, claveDeSistema));
    }
  }
}
