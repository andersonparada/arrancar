import type { Operador } from '../../../../core/compartido/aplicacion/operador.js';
import { Identificador } from '../../../../core/compartido/dominio/identificador.js';
import { ConceptoDeIngreso } from '../../../dominio/concepto-de-ingreso.js';
import { CONCEPTOS_DE_INGRESO_SUGERIDOS } from '../../../dominio/conceptos-de-ingreso-iniciales.js';
import { AsegurarConceptosDeSistema } from './asegurar-conceptos-de-sistema.js';
import type { DependenciasDeConceptosDeIngreso } from './dependencias-de-conceptos-de-ingreso.js';

/**
 * Da a la empresa su lista sugerida de conceptos de ingreso. Solo actúa si no tiene ninguno (empresa nueva o que
 * activa el módulo después); una vez sembrada, la empresa manda y solo se asegura el concepto de sistema. Corre dentro de la
 * unidad de trabajo de quien la llama, con la empresa a sembrar como empresa activa.
 */
export class SembrarConceptosDeIngreso {
  constructor(private readonly dependencias: Pick<DependenciasDeConceptosDeIngreso, 'repositorio'>) {}

  async ejecutar(operador: Operador): Promise<void> {
    const { repositorio } = this.dependencias;
    if (await repositorio.hayAlguno()) {
      await new AsegurarConceptosDeSistema(this.dependencias).ejecutar(operador);
      return;
    }
    const empresaId = Identificador.desde<'Empresa'>(operador.empresaId);
    const conceptos = CONCEPTOS_DE_INGRESO_SUGERIDOS.map(({ datos, claveDeSistema }) =>
      ConceptoDeIngreso.crear(empresaId, datos, claveDeSistema),
    );
    await repositorio.sembrar(conceptos);
  }
}
